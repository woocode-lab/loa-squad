import React, { useState, memo, useCallback } from 'react';
import { Sword, Sparkles, Users, Zap, AlertTriangle, Share2, Check, Ban, ChevronDown, ChevronUp } from 'lucide-react';
import { ProcessedCharacter, GroupedMatch } from '../types';
import { formatCombatPower, calculateAverage } from '../matchingLogic';

interface RaidCardProps {
  match: GroupedMatch;
  searchedNicknames: string[];
  selections: (ProcessedCharacter | null)[];
  onToggleSelection: (raidId: string, pIdx: number, char: ProcessedCharacter) => void;
  onDeselectAll: (raidId: string) => void;
}

// 1. 시너지 타입 분류 및 아이콘 로직을 컴포넌트 외부로 이동 (메모리 절약 및 안정성)
const getSynergyType = (text: string) => {
  if (!text) return 'none';
  if (text.includes('치명타')) return 'crit';
  if (text.includes('방어력')) return 'def';
  if (text.includes('받는 피해')) return 'dmg';
  if (text.includes('공격력')) return 'atk';
  if (text.includes('공격 속도') || text.includes('이동 속도')) return 'speed';
  return text;
};

const getClassIcon = (className: string) => {
  if (['바드', '홀리나이트', '도화가'].includes(className)) return <Sparkles className="w-4 h-4 text-blue-500 dark:text-blue-400" />;
  return <Sword className="w-4 h-4 text-red-500 dark:text-red-400" />;
};

// 2. 개별 캐릭터 항목을 memo 컴포넌트로 분리
const CharacterItem = memo(({ char, isSelected, isSynergyDuplicate, raidId, pIdx, onToggle }: {
  char: ProcessedCharacter;
  isSelected: boolean;
  isSynergyDuplicate: boolean;
  raidId: string;
  pIdx: number;
  onToggle: (raidId: string, pIdx: number, char: ProcessedCharacter) => void;
}) => {
  const isSupport = char.role === '서포터';
  
  return (
    <div 
      onClick={() => onToggle(raidId, pIdx, char)} 
      className={`group/char relative pl-4 pr-3 py-3 rounded-xl border-2 cursor-pointer transition-[transform,background-color,border-color,box-shadow] duration-200 overflow-hidden ${
        isSelected 
          ? 'bg-white dark:bg-gray-800 border-yellow-400 dark:border-lostark-gold shadow-lg scale-[1.02] z-10' 
          : 'bg-white dark:bg-gray-800/40 border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
      }`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isSupport ? 'bg-blue-500' : 'bg-red-500'}`} />
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1 rounded-md ${isSupport ? 'bg-blue-500/10' : 'bg-red-500/10'}`}>
            {getClassIcon(char.CharacterClassName)}
          </div>
          <span className={`text-sm font-bold ${isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-200'}`}>
            {char.CharacterName}
          </span>
        </div>
        <span className="text-xs font-bold font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/80 px-1.5 py-0.5 rounded">
          <span className="text-[10px] mr-0.5 opacity-70">Lv.</span>{char.ItemMaxLevel.split('.')[0]}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <div className={`text-lg font-black font-mono leading-none ${isSelected ? 'text-yellow-600 dark:text-lostark-gold' : 'text-gray-600 dark:text-gray-300'}`}>
            {formatCombatPower(char.parsedCombatPower)}
          </div>
          <div className="text-[10px] text-gray-400 font-medium mt-1">
            {char.CharacterClassName} {char.arkPassive && <span className="text-yellow-600/70 dark:text-lostark-gold/70">· {char.arkPassive}</span>}
          </div>
        </div>
        <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isSupport ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
          {char.role}
        </div>
      </div>
      {!isSupport && char.synergy && (
        <div className="mt-2 pt-2 border-t border-gray-50 dark:border-gray-800/50">
          <div className={`text-[11px] font-medium flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${isSynergyDuplicate ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/50 animate-pulse' : 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border-amber-200/50 dark:border-amber-700/30'}`}>
            {isSynergyDuplicate ? <AlertTriangle className="w-3 h-3 text-red-500" /> : <Zap className="w-3 h-3 text-amber-500" />}
            <span>{char.synergy}</span>
            {isSynergyDuplicate && <span className="text-[9px] ml-auto font-bold text-red-500">중복</span>}
          </div>
        </div>
      )}
    </div>
  );
});

export const RaidCard = memo(({
  match,
  searchedNicknames,
  selections,
  onToggleSelection,
  onDeselectAll
}: RaidCardProps) => {
  const [copied, setCopied] = useState(false);
  const selectedChars = selections.filter((c): c is ProcessedCharacter => !!c);
  const hasSelection = selectedChars.length > 0;

  const [expandedParticipants, setExpandedParticipants] = useState<Record<number, boolean>>({});

  const toggleExpand = useCallback((pIdx: number) => {
    setExpandedParticipants(prev => ({
      ...prev,
      [pIdx]: !prev[pIdx]
    }));
  }, []);

  const INITIAL_SHOW_COUNT = 3;

  const displayAvgCp = hasSelection
    ? calculateAverage(selectedChars.map(c => c.parsedCombatPower))
    : match.averageCombatPower;

  const displayDealerCount = hasSelection
    ? selectedChars.filter(c => c.role === '딜러').length
    : match.dealerCount;

  const displaySupportCount = hasSelection
    ? selectedChars.filter(c => c.role === '서포터').length
    : match.supportCount;

  // 선택된 딜러들의 시너지 중복 확인
  const activeSynergies = new Set<string>();
  const duplicateSynergies = new Set<string>();

  selectedChars.forEach(char => {
    if (char.role === '서포터' || !char.synergy) return;
    const type = getSynergyType(char.synergy);
    if (activeSynergies.has(type)) {
      duplicateSynergies.add(type);
    }
    activeSynergies.add(type);
  });

  const handleShare = async () => {
    if (!hasSelection) return;

    const lines = [`[${match.raidName}] ${match.difficulty} - 평균 ${formatCombatPower(displayAvgCp)}`];
    
    const validSelections = selections.filter((c): c is ProcessedCharacter => !!c);

    validSelections.forEach((char, idx) => {
      const roleIcon = char.role === '서포터' ? '🛡️' : '⚔️';
      const synergy = (char.role !== '서포터' && char.synergy) ? ` [${char.synergy}]` : '';
      lines.push(`${idx + 1}. ${roleIcon} ${char.CharacterName} (${char.CharacterClassName}) ${formatCombatPower(char.parsedCombatPower)}${synergy}`);
    });

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="group relative bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden transition-[border-color,box-shadow] duration-200 hover:border-yellow-400 dark:hover:border-lostark-gold/50 hover:shadow-2xl">
      {/* Card Header */}
      <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-100 dark:border-gray-800/50 relative z-10">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider border ${match.difficulty === '하드' ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' : match.difficulty === '나메' ? 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20' : 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'}`}>
              {match.difficulty}
            </span>
            <span className="text-sm text-gray-500 font-mono">Lv.{match.level}</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-yellow-600 dark:group-hover:text-lostark-gold transition-all">
            {match.raidName}
          </h2>
        </div>

        <div className="flex items-center gap-6">
          {hasSelection && (
            <div className="flex flex-col items-end">
              <span className="text-yellow-600 dark:text-lostark-gold font-bold text-sm">{selectedChars.length}명 선택됨</span>
              <div className="flex items-center gap-2 mt-1">
                <button onClick={handleShare} className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1" title="파티 구성 복사">
                  {copied ? <Check className="w-3 h-3 text-green-500" /> : <Share2 className="w-3 h-3" />}
                  {copied ? '복사됨' : '공유'}
                </button>
                <span className="text-gray-300 dark:text-gray-700 text-[10px]">|</span>
                <button onClick={() => onDeselectAll(match.raidId)} className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                  초기화
                </button>
              </div>
            </div>
          )}
          <div className="flex flex-col items-end gap-1">
            <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">평균 전투력</div>
            <div className={`font-mono text-lg ${hasSelection ? 'text-yellow-600 dark:text-lostark-gold font-bold' : 'text-gray-700 dark:text-gray-300'}`}>
              {formatCombatPower(displayAvgCp)}
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex flex-col items-center bg-gray-50 dark:bg-gray-800/50 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700/50">
              <Sword className="w-4 h-4 text-red-500 dark:text-red-400 mb-1" />
              <span className="font-bold text-red-700 dark:text-red-200">{displayDealerCount}</span>
            </div>
            <div className="flex flex-col items-center bg-gray-50 dark:bg-gray-800/50 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700/50">
              <Sparkles className="w-4 h-4 text-blue-500 dark:text-blue-400 mb-1" />
              <span className="font-bold text-blue-700 dark:text-blue-200">{displaySupportCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {match.participantMatches.map((chars, pIdx) => {
          if (chars.length === 0) return null;

          const isExpanded = !!expandedParticipants[pIdx];
          const selectedCharName = selections[pIdx]?.CharacterName;
          
          const { visibleChars, hasMore, hiddenCount } = (() => {
            if (chars.length <= INITIAL_SHOW_COUNT) {
              return { visibleChars: chars, hasMore: false, hiddenCount: 0 };
            }
            if (isExpanded) {
              return { visibleChars: chars, hasMore: true, hiddenCount: 0 };
            }
            const sliced = chars.slice(0, INITIAL_SHOW_COUNT);
            const selectedIdx = chars.findIndex(c => c.CharacterName === selectedCharName);
            
            // 선택된 캐릭터가 초기 노출 범위를 벗어나 있다면, 해당 캐릭터를 목록 끝에 추가하여 보여줌
            if (selectedIdx !== -1 && selectedIdx >= INITIAL_SHOW_COUNT) {
              return { 
                visibleChars: [...sliced, chars[selectedIdx]], 
                hasMore: true, 
                hiddenCount: chars.length - INITIAL_SHOW_COUNT - 1 
              };
            }
            return { visibleChars: sliced, hasMore: true, hiddenCount: chars.length - INITIAL_SHOW_COUNT };
          })();

          return (
            <div key={pIdx} className="flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b-2 border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">{searchedNicknames[pIdx]}</span>
                </div>
                <span className="text-[10px] font-bold text-gray-400">{chars.length} 캐릭터</span>
              </div>
              <div className="space-y-3">
                {visibleChars.map(char => {
                  const isSelected = selections[pIdx]?.CharacterName === char.CharacterName;
                  const isSupport = char.role === '서포터';
                  const isSynergyDuplicate = isSelected && !isSupport && char.synergy && duplicateSynergies.has(getSynergyType(char.synergy));

                  return (
                    <CharacterItem
                      key={`${char.ServerName}-${char.CharacterName}`}
                      char={char}
                      isSelected={isSelected}
                      isSynergyDuplicate={!!isSynergyDuplicate}
                      raidId={match.raidId}
                      pIdx={pIdx}
                      onToggle={onToggleSelection}
                    />
                  );
                })}
              </div>
              {hasMore && (
                <button
                  onClick={() => toggleExpand(pIdx)}
                  className="w-full py-2 text-[10px] font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-gray-50/50 dark:bg-gray-800/30 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 transition-all flex items-center justify-center gap-1 mt-1"
                >
                  {isExpanded ? (
                    <>접기 <ChevronUp className="w-3 h-3" /></>
                  ) : (
                    <>더 보기 (+{hiddenCount}) <ChevronDown className="w-3 h-3" /></>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});