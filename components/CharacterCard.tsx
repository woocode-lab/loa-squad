import React from 'react';
import { ProcessedCharacter, RaidInfo } from '../types';
import { Shield, Sword, Sparkles, Crosshair, Users, Info } from 'lucide-react';

interface CharacterCardProps {
  character: ProcessedCharacter;
  matchRaidIds: Set<string>; // IDs of raids that overlap with the other person's roster
}

// Simple mapping for class icons based on archetype guess or static assignment
// In a real app, we'd use actual sprite assets.
const getClassIcon = (className: string) => {
  if (['바드', '홀리나이트', '도화가'].includes(className)) return <Sparkles className="w-5 h-5 text-blue-300" />;
  if (['워로드', '디스트로이어'].includes(className)) return <Shield className="w-5 h-5 text-orange-300" />;
  if (['건슬링어', '데빌헌터', '호크아이', '블래스터', '스카우터'].includes(className)) return <Crosshair className="w-5 h-5 text-green-300" />;
  return <Sword className="w-5 h-5 text-red-300" />;
};

export const CharacterCard: React.FC<CharacterCardProps> = ({ character, matchRaidIds }) => {
  return (
    <div className="bg-lostark-card border border-gray-700 rounded-lg overflow-hidden flex flex-col shadow-lg hover:border-gray-500 transition-all duration-200">
      {/* Header */}
      <div className="bg-gray-800 p-3 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-2">
          {getClassIcon(character.CharacterClassName)}
          <span className="font-bold text-gray-100">{character.CharacterName}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-gray-400">{character.CharacterClassName}</span>
          <span className="text-lostark-gold font-mono font-bold text-lg leading-none">
            {character.ItemMaxLevel}
          </span>
        </div>
      </div>

      {/* Body - Raids */}
      <div className="p-3 flex-1 flex flex-col gap-2">
        <div className="text-xs text-gray-500 font-semibold mb-1 flex items-center gap-1">
          <Users className="w-3 h-3" /> 참여 가능 레이드
        </div>
        
        <div className="flex flex-wrap gap-2">
          {character.availableRaids.length === 0 ? (
             <span className="text-gray-600 text-sm">매칭 가능한 레이드 없음</span>
          ) : (
            character.availableRaids.map((raid) => {
              const isMatch = matchRaidIds.has(raid.id);
              
              // Color logic based on difficulty
              let badgeColor = "bg-gray-700 text-gray-300 border-gray-600";
              if (raid.difficulty === '하드') badgeColor = "bg-red-900/30 text-red-200 border-red-800";
              if (raid.difficulty === '나메') badgeColor = "bg-purple-900/30 text-purple-200 border-purple-800";
              
              // Highlight if matched
              const highlightClass = isMatch 
                ? "ring-2 ring-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]" 
                : "opacity-80 hover:opacity-100";

              return (
                <div 
                  key={raid.id}
                  className={`
                    px-2 py-1 rounded text-xs border ${badgeColor} ${highlightClass}
                    transition-all duration-200 cursor-default flex items-center gap-1
                  `}
                >
                  <span className="font-medium">{raid.name}</span>
                  <span className={`text-[10px] px-1 rounded-sm ${
                    raid.difficulty === '노말' ? 'bg-gray-600 text-white' : 
                    raid.difficulty === '하드' ? 'bg-red-600 text-white' : 'bg-purple-600 text-white'
                  }`}>
                    {raid.difficulty}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
      
      {/* Footer info */}
      <div className="px-3 py-2 bg-gray-900/50 text-xs text-gray-500 flex justify-between">
        <span>{character.ServerName}</span>
      </div>
    </div>
  );
};
