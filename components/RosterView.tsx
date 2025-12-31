import React from 'react';
import { ProcessedCharacter } from '../types';
import { CharacterCard } from './CharacterCard';
import { Loader2 } from 'lucide-react';

interface RosterViewProps {
  title: string;
  roster: ProcessedCharacter[];
  matchRaidIds: Set<string>;
  loading: boolean;
  emptyMessage?: string;
}

export const RosterView: React.FC<RosterViewProps> = ({ title, roster, matchRaidIds, loading, emptyMessage }) => {
  return (
    <div className="flex flex-col h-full bg-gray-800/30 rounded-xl p-4 border border-gray-700/50">
      <h2 className="text-lg font-bold text-gray-200 mb-4 px-1 flex items-center gap-2 border-l-4 border-lostark-gold pl-3">
        {title}
        {roster.length > 0 && <span className="text-sm font-normal text-gray-400">({roster.length} 캐릭터)</span>}
      </h2>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 min-h-[300px]">
          <Loader2 className="w-10 h-10 animate-spin text-lostark-gold mb-3" />
          <span className="animate-pulse">원정대 정보 조회 중...</span>
        </div>
      ) : roster.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-500 min-h-[200px] border-2 border-dashed border-gray-700 rounded-lg">
          {emptyMessage || "캐릭터 정보가 없습니다."}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 auto-rows-min">
          {roster.map((char) => (
            <CharacterCard 
              key={`${char.ServerName}-${char.CharacterName}`} 
              character={char} 
              matchRaidIds={matchRaidIds}
            />
          ))}
        </div>
      )}
    </div>
  );
};
