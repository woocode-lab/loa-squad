import { ProcessedCharacter, MatchResult, GroupedMatch, ExcludedCharacter } from './types';
import { RAID_TIERS } from './constants';

// --- 기본 데이터 정의 ---

// RAID_TIERS를 평탄화하여 레벨 내림차순으로 정렬된 단일 레이드 리스트 생성
export const FLAT_RAID_LIST = RAID_TIERS.flatMap(tier => 
  tier.raids.map(raid => ({
    ...raid,
    level: tier.minLevel // tier의 minLevel을 해당 레이드의 레벨로 사용
  }))
).sort((a, b) => b.level - a.level);

export const MAIN_TAB_RAIDS = [
  "세르카",
  "종막: 카제로스",
  "4막: 아르모체",
  "3막: 모르둠",
  "2막: 아브렐슈드"
];

export const SUPPORT_CLASSES = ['바드', '홀리나이트', '도화가'];

// --- 헬퍼 함수 ---

export const getRole = (className: string): '서포터' | '딜러' => 
  SUPPORT_CLASSES.includes(className) ? '서포터' : '딜러';

export const formatCombatPower = (power: number): string => 
  power.toLocaleString();

export const calculateAverage = (numbers: number[]): number => {
  if (numbers.length === 0) return 0;
  const sum = numbers.reduce((a, b) => a + b, 0);
  return Math.round(sum / numbers.length);
};

export const parseLevel = (levelStr: string): number => 
  parseFloat(levelStr?.replace(/,/g, '') || '0');

export const parseCombatPower = (powerStr: string): number => 
  Math.floor(parseFloat(powerStr?.replace(/,/g, '') || '0'));
// --- 핵심 매칭 로직 ---

export function matchRaidParties(
  myCharacters: ProcessedCharacter[],
  targetCharacters: ProcessedCharacter[],
  minCombatPower: number
): { matches: MatchResult[]; excluded: ProcessedCharacter[] } {
  const excluded: ProcessedCharacter[] = [];

  const filterQualified = (chars: ProcessedCharacter[]) => 
    chars.filter(c => {
      if (c.parsedCombatPower < minCombatPower) { 
        excluded.push(c);
        return false;
      }
      return true;
    });

  const myQualified = filterQualified(myCharacters);
  const targetQualified = filterQualified(targetCharacters);

    const matches = FLAT_RAID_LIST.reduce<MatchResult[]>((acc, raid) => {
    const myEligible = myQualified.filter(c => c.parsedItemLevel >= raid.level);
    const targetEligible = targetQualified.filter(c => c.parsedItemLevel >= raid.level);

    if (myEligible.length > 0 && targetEligible.length > 0) {
        const combined = [...myEligible, ...targetEligible];
        acc.push({
            raid: { ...raid, id: `${raid.name}_${raid.difficulty}` },
            myEligible,
            targetEligible,
            averageCombatPower: calculateAverage(combined.map(c => c.parsedCombatPower)),
            dealerCount: combined.filter(c => c.role === '딜러').length,
            supporterCount: combined.filter(c => c.role === '서포터').length,
        });
        }
        return acc;
    }, []);

  return { matches, excluded };
}

// --- 새로운 그룹화 로직 ---

export function getGroupedRaidMatches(
  allRosters: ProcessedCharacter[][]
): { matches: GroupedMatch[]; excluded: ExcludedCharacter[] } {
  const matches: GroupedMatch[] = [];
  const excluded: ExcludedCharacter[] = [];

  FLAT_RAID_LIST.forEach(raid => {
    // 2. 레이드 레벨 조건 필터링
    const participantMatches = allRosters.map(roster => 
      roster.filter(c => {
        // 1. 해당 레이드 권장 레벨보다 낮으면 무조건 제외
        if (c.parsedItemLevel < raid.level) return false;
        
        // UX 개선: 동일한 이름의 더 높은 난이도 레이드에 참여 가능한 경우, 하위 난이도 매칭에서는 제외
        const hasHigherDifficulty = FLAT_RAID_LIST.some(r => 
          r.name === raid.name && r.level > raid.level && c.parsedItemLevel >= r.level
        );
        return !hasHigherDifficulty;
      })
    );

    // 해당 레이드에 참여 가능한 인원이 1명이라도 있으면 목록에 표시 (기존 2명 제한 완화)
    const participantsWithChars = participantMatches.filter(m => m.length > 0).length;

    if (participantsWithChars >= 1) {
      const allEligibleChars = participantMatches.flat();

      matches.push({
        raidId: raid.id,
        raidName: raid.name,
        difficulty: raid.difficulty,
        level: raid.level,
        participantMatches,
        averageCombatPower: calculateAverage(allEligibleChars.map(c => c.parsedCombatPower)),
        dealerCount: allEligibleChars.filter(c => c.role === '딜러').length,
        supportCount: allEligibleChars.filter(c => c.role === '서포터').length,
      });
    }
  });

  return { matches, excluded };
}