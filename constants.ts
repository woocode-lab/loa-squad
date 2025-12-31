import { RaidTier } from './types';

export const MIN_ITEM_LEVEL = 1640;

// Defined based on the prompt's requirements
export const RAID_TIERS: RaidTier[] = [
  {
    minLevel: 1740,
    raids: [{ name: '세르카', difficulty: '나메', id: 'serka_nm', level: 1740 }]
  },
  {
    minLevel: 1730,
    raids: [
      { name: '종막: 카제로스', difficulty: '하드', id: 'kazeros_hm', level: 1730 },
      { name: '세르카', difficulty: '하드', id: 'serka_hm', level: 1730 }
    ]
  },
  {
    minLevel: 1720,
    raids: [{ name: '4막: 아르모체', difficulty: '하드', id: 'armotel_hm', level: 1720 }]
  },
  {
    minLevel: 1710,
    raids: [
      { name: '종막: 카제로스', difficulty: '노말', id: 'kazeros_nm', level: 1710 },
      { name: '세르카', difficulty: '노말', id: 'serka_nm_normal', level: 1710 }
    ]
  },
  {
    minLevel: 1700,
    raids: [
      { name: '3막: 모르둠', difficulty: '하드', id: 'mordum_hm', level: 1700 },
      { name: '4막: 아르모체', difficulty: '노말', id: 'armotel_nm', level: 1700 }
    ]
  },
  {
    minLevel: 1690,
    raids: [{ name: '2막: 아브렐슈드', difficulty: '하드', id: 'brel_hm', level: 1690 }]
  },
  {
    minLevel: 1680,
    raids: [
      { name: '1막: 에기르', difficulty: '하드', id: 'aegir_hm', level: 1680 },
      { name: '2막: 아브렐슈드', difficulty: '노말', id: 'brel_nm', level: 1680 },
      { name: '3막: 모르둠', difficulty: '노말', id: 'mordum_nm', level: 1680 }
    ]
  },
  {
    minLevel: 1660,
    raids: [{ name: '1막: 에기르', difficulty: '노말', id: 'aegir_nm', level: 1660 }]
  },
  {
    minLevel: 1640,
    raids: [
      { name: '베히모스', difficulty: '노말', id: 'behemoth_nm', level: 1640 },
      { name: '서막: 에키드나', difficulty: '하드', id: 'echidna_hm', level: 1640 }
    ]
  }
];

export const SYNERGY_DATA: Record<string, { type: 'fixed' | 'variant', text?: string, options?: Record<string, string>, default?: string }> = {
  '가디언나이트': { type: 'fixed', text: '피해량 증가 6%' },
  '기상술사': {
    type: 'variant',
    options: {
      '질풍노도': '치명타 적중률 10%, 공격 속도 12%, 이동 속도 12%',
      '이슬비': '치명타 적중률 10%, 적 공격력 감소 10%'
    },
    default: '치명타 적중률 10%'
  },
  '호크아이': {
    type: 'variant',
    options: {
      '두 번째 동료': '피해량 증가 6%, 이동 속도 8%',
      '죽음의 습격': '피해량 증가 6%'
    },
    default: '피해량 증가 6%'
  },
  '서머너': { type: 'fixed', text: '방어력 감소 12%, 마나 회복 속도 40%' },
  '블레이드': { type: 'fixed', text: '피해량 증가 4%, 백헤드 5%, 공격 속도 12.8%, 이동 속도 12.8%' },
  '배틀마스터': { type: 'fixed', text: '치명타 적중률 10%, 공격 속도 8%, 이동 속도 16%' },
  '스트라이커': { type: 'fixed', text: '치명타 적중률 10%, 공격 속도 8%' },
  '아르카나': { type: 'fixed', text: '치명타 적중률 10%' },
  '데빌헌터': { type: 'fixed', text: '치명타 적중률 10%' },
  '건슬링어': { type: 'fixed', text: '치명타 적중률 10%' },
  '인파이터': { type: 'fixed', text: '피해량 증가 6%' },
  '브레이커': { type: 'fixed', text: '피해량 증가 6%' },
  '버서커': { type: 'fixed', text: '피해량 증가 6%' },
  '슬레이어': { type: 'fixed', text: '피해량 증가 6%' },
  '소서리스': { type: 'fixed', text: '피해량 증가 6%' },
  '소울이터': { type: 'fixed', text: '피해량 증가 6%' },
  '데모닉': { type: 'fixed', text: '피해량 증가 6%' },
  '창술사': { type: 'fixed', text: '치명타 피해량 8%' },
  '블래스터': { type: 'fixed', text: '방어력 감소 12%' },
  '리퍼': { type: 'fixed', text: '방어력 감소 12%' },
  '환수사': { type: 'fixed', text: '방어력 감소 12%' },
  '스카우터': { type: 'fixed', text: '공격력 증가 6%' },
  '기공사': { type: 'fixed', text: '공격력 증가 6%' },
  '디스트로이어': { type: 'fixed', text: '방어력 감소 12%' },
  '워로드': { type: 'fixed', text: '방어력 감소 12%' },
  '발키리': { type: 'fixed', text: '피해량 증가 6%' },
  '바드': { type: 'fixed', text: '적에게 받는 피해 증가 10%' },
  '홀리나이트': { type: 'fixed', text: '적에게 받는 피해 증가 10%' },
  '도화가': { type: 'fixed', text: '적에게 받는 피해 증가 10%' },
};

export const ABBREVIATIONS: Record<string, string> = {
  '피해량 증가': '피증',
  '치명타 적중률': '치적',
  '방어력 감소': '방깍',
  '공격 속도': '공속',
  '이동 속도': '이속',
  '공격력 증가': '공증',
  '치명타 피해량': '치피',
  '적에게 받는 피해 증가': '받피증'
};

export const formatSynergy = (text: string): string => {
  let formatted = text;
  // Handle "공격 속도 X%, 이동 속도 X%" -> "공이속 X%" if values match, or just replace individually
  formatted = formatted.replace(/공격 속도 (\d+(\.\d+)?)%, 이동 속도 \1%/g, '공이속 $1%');
  
  Object.entries(ABBREVIATIONS).forEach(([key, value]) => {
    formatted = formatted.replace(new RegExp(key, 'g'), value);
  });
  return formatted;
};
