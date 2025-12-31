export interface Character {
  ServerName: string;
  CharacterName: string;
  CharacterLevel: number;
  CharacterClassName: string;
  ItemAvgLevel: string; // comes as "1,640.00"
  ItemMaxLevel: string;
  CombatPower?: string; // API에서 제공하는 전투력 (문자열)
}

export interface ProcessedCharacter extends Character {
  parsedItemLevel: number;
  parsedCombatPower: number;
  role: '딜러' | '서포터';
  availableRaids: RaidInfo[];
  synergy?: string;
  arkPassive?: string;
}

export interface RaidInfo {
  name: string;
  level: number; // RAID_DATA의 level과 매칭
  difficulty: string;
  id: string; // unique key for matching
  gold?: number;
}

export type ViewMode = 'split' | 'list';

export interface RaidTier {
  minLevel: number;
  raids: RaidInfo[];
}

export interface MatchResult {
  raid: RaidInfo;
  myEligible: ProcessedCharacter[];
  targetEligible: ProcessedCharacter[];
  averageCombatPower: number;
  dealerCount: number;
  supporterCount: number;
}

export interface GroupedMatch {
  raidId: string;
  raidName: string;
  difficulty: string;
  level: number;
  participantMatches: ProcessedCharacter[][]; // 인덱스별로 참가자 캐릭터 목록 저장
  averageCombatPower: number;
  dealerCount: number;
  supportCount: number;
}

export interface ExcludedCharacter {
  character: ProcessedCharacter;
  reason: string;
  power: number;
}