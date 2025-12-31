import React, { useState, useEffect } from 'react';
import { Settings, Globe, X, Save, Sun, Moon, Trash2, ExternalLink, Info } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onSave: (apiKey: string, showAllServers: boolean) => void;
  initialApiKey?: string;
  initialShowAllServers?: boolean;
  onClose?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onResetData?: (keepApiKey: boolean) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ 
  isOpen, 
  onSave, 
  initialApiKey = '', 
  initialShowAllServers = false,
  onClose,
  theme = 'dark',
  onToggleTheme,
  onResetData
}) => {
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [showAllServers, setShowAllServers] = useState(initialShowAllServers);
  const [keepApiKey, setKeepApiKey] = useState(true);

  useEffect(() => {
    setApiKey(initialApiKey);
    setShowAllServers(initialShowAllServers);
  }, [initialApiKey, initialShowAllServers, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(apiKey, showAllServers);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-800 overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
          <h3 className="font-bold text-lg flex items-center gap-2 text-gray-900 dark:text-white">
            <Settings className="w-5 h-5 text-gray-500" /> 설정
          </h3>
          {onClose && (
            <button onClick={onClose} className="text-gray-500 hover:text-gray-900 dark:hover:text-white">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              LostArk API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="API Key를 입력하세요"
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-400 dark:focus:ring-lostark-gold outline-none text-gray-900 dark:text-white"
            />
            <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-lg flex items-start gap-3">
              <Info className="w-4 h-4 text-amber-600 dark:text-lostark-gold mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-amber-800 dark:text-amber-200">API Key가 없으신가요?</p>
                <a 
                  href="https://developer-lostark.game.onstove.com/" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-xs text-amber-700 dark:text-lostark-gold hover:underline flex items-center gap-1 font-bold"
                >
                  로스트아크 개발자 센터에서 발급받기
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${showAllServers ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-lostark-gold' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                  <Globe className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">모든 서버 캐릭터 보기</span>
                  <span className="text-xs text-gray-500">주 서버 외의 캐릭터도 검색 결과에 포함합니다.</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAllServers(!showAllServers)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 dark:focus:ring-lostark-gold focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${showAllServers ? 'bg-yellow-400 dark:bg-lostark-gold' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showAllServers ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </div>

            {onToggleTheme && (
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-yellow-100 text-yellow-600'}`}>
                    {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">다크 모드</span>
                    <span className="text-xs text-gray-500">화면 테마를 {theme === 'dark' ? '라이트' : '다크'} 모드로 전환합니다.</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onToggleTheme}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 dark:focus:ring-lostark-gold focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${theme === 'dark' ? 'bg-yellow-400 dark:bg-lostark-gold' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>
            )}
          </div>

          {onResetData && (
            <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
              <h4 className="text-sm font-bold text-red-500 mb-2 flex items-center gap-2">
                <Trash2 className="w-4 h-4" /> 데이터 초기화
              </h4>
              <p className="text-xs text-gray-500 mb-3">
                저장된 API Key, 프리셋 등 모든 데이터를 삭제하고 초기화합니다.
              </p>
              
              <div className="flex items-center gap-2 mb-3">
                <input 
                  type="checkbox" 
                  id="keepApiKey"
                  checked={keepApiKey}
                  onChange={(e) => setKeepApiKey(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500 cursor-pointer"
                />
                <label htmlFor="keepApiKey" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">API Key 유지하기</label>
              </div>

              <button
                type="button"
                onClick={() => onResetData(keepApiKey)}
                className="w-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 font-bold py-2 px-4 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors text-sm"
              >
                데이터 삭제
              </button>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-yellow-400 dark:bg-lostark-gold text-gray-900 font-bold py-2 px-4 rounded-lg hover:bg-yellow-500 dark:hover:bg-yellow-600 transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" /> 저장하기
          </button>
        </form>
      </div>
    </div>
  );
};