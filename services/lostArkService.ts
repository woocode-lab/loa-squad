import { LostArkCharacter, ProcessedCharacter, RaidInfo } from '../types';
import { MIN_ITEM_LEVEL, RAID_TIERS, SYNERGY_DATA, formatSynergy } from '../constants';
import { FLAT_RAID_LIST } from '../matchingLogic';

const BASE_URL = 'https://developer-lostark.game.onstove.com';

// Provided Mock Data for Fallback/Demo
const MOCK_DATA: LostArkCharacter[] = [];

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const parseLevel = (levelStr: string): number => {
  return parseFloat(levelStr.replace(/,/g, ''));
};

const getRaidsForLevel = (level: number): RaidInfo[] => {
  const allEligible = FLAT_RAID_LIST.filter(r => level >= r.level);
  const uniqueRaids: RaidInfo[] = [];
  const seenNames = new Set<string>();

  // FLAT_RAID_LIST는 이미 레벨 내림차순이므로, 
  // 처음 발견되는 레이드 이름이 해당 캐릭터가 갈 수 있는 최고 난이도입니다.
  for (const raid of allEligible) {
    if (!seenNames.has(raid.name)) {
      uniqueRaids.push(raid);
      seenNames.add(raid.name);
    }
  }
  return uniqueRaids;
};

const processData = (data: LostArkCharacter[]): ProcessedCharacter[] => {
    return data
      .map(char => {
        const lvl = parseLevel(char.ItemMaxLevel || char.ItemAvgLevel); // Fallback if MaxLevel is missing
        return {
          ...char,
          ItemMaxLevel: char.ItemMaxLevel || char.ItemAvgLevel, // Ensure property exists
          parsedItemLevel: lvl,
          availableRaids: getRaidsForLevel(lvl)
        } as ProcessedCharacter;
      })
      .filter(char => char.parsedItemLevel >= MIN_ITEM_LEVEL)
      .sort((a, b) => b.parsedItemLevel - a.parsedItemLevel);
};

const fetchCharacterArmory = async (characterName: string, apiKey: string): Promise<any> => {
  let retries = 3;
  const filters = 'profiles+engravings+arkpassive';
  while (retries > 0) {
    try {
      const response = await fetch(`${BASE_URL}/armories/characters/${encodeURIComponent(characterName)}?filters=${filters}`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'authorization': `bearer ${apiKey}`
        }
      });
      
      if (response.ok) return await response.json();
      if (response.status === 429 || response.status >= 500) {
         await wait(1000);
         retries--;
         continue;
      }
      return null;
    } catch (error) {
      console.warn(`Failed to fetch armory for ${characterName}`, error);
      retries--;
      if (retries > 0) await wait(1000);
    }
  }
  return null;
};

const ARK_PASSIVE_MAP: Record<string, string[]> = {
  "버서커": ["광전사의 비기", "광기"],
  "디스트로이어": ["분노의 망치", "중력 수련"],
  "워로드": ["고독한 기사", "전투 태세"],
  "홀리나이트": ["심판자", "축복의 오라"],
  "슬레이어": ["처단자", "포식자"],
  "발키리": ["빛의 기사", "해방자"],
  "배틀마스터": ["초심", "오의 강화"],
  "인파이터": ["극의 : 체술", "충격 단련"],
  "기공사": ["세맥타통", "역천지체"],
  "창술사": ["절정", "절제"],
  "스트라이커": ["일격필살", "오의난무"],
  "브레이커": ["권왕파천무", "수라의 길"],
  "데빌헌터": ["강화 무기", "전술 탄환"],
  "블래스터": ["화력 강화", "포격 강화"],
  "호크아이": ["두 번째 동료", "죽음의 습격"],
  "스카우터": ["진화의 유산", "아르데타인의 기술"],
  "건슬링어": ["피스메이커", "사냥의 시간"],
  "아르카나": ["황후의 은총", "황제의 칙령"],
  "서머너": ["상급 소환사", "넘치는 교감"],
  "바드": ["진실된 용맹", "절실한 구원"],
  "소서리스": ["점화", "환류"],
  "데모닉": ["완벽한 억제", "멈출 수 없는 충동"],
  "블레이드": ["잔재된 기운", "버스트"],
  "리퍼": ["갈증", "달의 소리"],
  "소울이터": ["만월의 집행자", "그믐의 경계"],
  "도화가": ["회귀", "만개"],
  "기상술사": ["질풍노도", "이슬비"],
  "환수사": ["야성", "환수 각성"],
  "가디언나이트": ["업화의 계승자", "드레드 로어"]
};

const getArkPassiveEngraving = (effects: any[], className: string): string => {
  const validEngravings = ARK_PASSIVE_MAP[className];
  if (!validEngravings || !effects) return '';

  // Filter for "깨달음" (Realization) effects
  const realizationEffects = effects.filter((eff: any) => eff.Name === '깨달음');

  for (const effect of realizationEffects) {
    try {
      if (!effect.ToolTip) continue;
      
      const tooltip = JSON.parse(effect.ToolTip);
      // Element_000 usually contains the NameTagBox with the value
      const nameElement = tooltip['Element_000'];
      
      if (nameElement && nameElement.value) {
        // Remove HTML tags
        const nodeName = nameElement.value.replace(/<[^>]*>/g, '').trim();

        // '피스메이커 - 핸드건'과 같이 부가 정보가 붙는 경우가 있어 startsWith로 변경
        const foundEngraving = validEngravings.find(engraving => nodeName.startsWith(engraving));
        if (foundEngraving) {
          return foundEngraving;
        }
      }
    } catch (e) {
      continue;
    }
  }

  return '';
};

export const fetchSiblings = async (
  characterName: string, 
  apiKey: string, 
  onProgress?: (current: number, total: number) => void
): Promise<ProcessedCharacter[]> => {
  if (!characterName) return [];

  try {
    // 1. Try Direct Call (Will likely fail due to CORS, triggering fallback)
    const response = await fetch(`${BASE_URL}/characters/${encodeURIComponent(characterName)}/siblings`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'authorization': `bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) throw new Error('401 Unauthorized: API Key를 확인해주세요.');
      // For other errors, we might want to fall through to mock data for demo purposes
      throw new Error(`API Error: ${response.status}`);
    }
    const data: LostArkCharacter[] = await response.json();

    // 1. Filter by Item Level first to reduce API calls
    const filteredData = data.filter(char => {
      const lvl = parseLevel(char.ItemMaxLevel || char.ItemAvgLevel);
      return lvl >= MIN_ITEM_LEVEL;
    });

    if (onProgress) onProgress(0, filteredData.length || 1);

    if (filteredData.length === 0) {
      if (onProgress) onProgress(1, 1);
      return [];
    }

    // 2. Fetch Profiles for Combat Power and Synergy
    // Note: If using proxyUrl, we might not be able to fetch profiles if the proxy doesn't support it.
    // We attempt direct call if apiKey is present.
    let completed = 0;
    const enrichedData = await Promise.all(filteredData.map(async (char, index) => {
      // Stagger requests to avoid rate limiting
      await wait(index * 100);

      if (apiKey) {
        const armory = await fetchCharacterArmory(char.CharacterName, apiKey);
        let combatPower = '0';
        let engravings: string[] = [];
        let arkPassiveName = '';

        if (armory) {
          const profile = armory.ArmoryProfile;
          const armoryEngraving = armory.ArmoryEngraving;
          const arkPassive = armory.ArkPassive;

          if (profile && profile.CombatPower) {
            combatPower = profile.CombatPower;
            char.CombatPower = combatPower;
          }
          if (armoryEngraving && armoryEngraving.Engravings) {
            engravings = armoryEngraving.Engravings.map((e: any) => e.Name);
          }
          if (arkPassive && arkPassive.IsArkPassive && arkPassive.Effects) {
            arkPassiveName = getArkPassiveEngraving(arkPassive.Effects, char.CharacterClassName);
          }
        }
        char.arkPassive = arkPassiveName;

        // Determine Synergy
        const synergyInfo = SYNERGY_DATA[char.CharacterClassName];
        let synergyText = '';

        if (synergyInfo) {
          if (synergyInfo.type === 'fixed') {
            synergyText = synergyInfo.text || '';
          } else if (synergyInfo.type === 'variant' && synergyInfo.options) {
            // Check Engravings first
            let foundOption = Object.keys(synergyInfo.options).find(opt => engravings.includes(opt));
            
            // If not found in engravings, check Ark Passive
            if (!foundOption) {
              if (arkPassiveName) {
                // Ark Passive Effects usually contain the class engraving name or similar effect description
                // We check if any effect Name contains the option key
                foundOption = Object.keys(synergyInfo.options).find(opt => arkPassiveName.includes(opt));
              }
            }

            synergyText = foundOption 
              ? synergyInfo.options[foundOption] 
              : (synergyInfo.default || '');
          }
        }
        
        char.synergy = formatSynergy(synergyText);
      }
      
      completed++;
      if (onProgress) onProgress(completed, filteredData.length);
      return char;
    }));

    return processData(enrichedData);

  } catch (error: any) {
    console.warn("API Call Failed:", error);

    // 3. Fallback to Mock Data (Demo Mode)
    // If we are in a development environment or CORS failed and no proxy is set, show mock data.
    if (error.message.includes('Failed to fetch') || error.message.includes('API Error')) {
        console.info("Falling back to Mock Data for demonstration.");
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Return Mock Data only
        // In a real app, you might want to only do this for specific names or show a toast
        return processData(MOCK_DATA);
    }
    
    throw error;
  }
};