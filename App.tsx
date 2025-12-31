import React, { useState, useEffect, useMemo, useCallback } from 'react';
import metadata from './metadata.json';
import { ApiKeyModal } from './components/ApiKeyModal';
import { fetchSiblings } from './services/lostArkService';
import { ProcessedCharacter, GroupedMatch, ExcludedCharacter } from './types';
import { Search, RefreshCw, AlertCircle, Settings, Plus, Trash2, Users, Ban, X, Check, HelpCircle, Info, Edit2, History, Shield, Swords } from 'lucide-react';
import { getGroupedRaidMatches, getRole, parseLevel, parseCombatPower, formatCombatPower, FLAT_RAID_LIST, MAIN_TAB_RAIDS } from './matchingLogic';
import { RaidCard } from './components/RaidCard';

interface Preset {
  id: string;
  name: string;
  nicknames: string[];
  rosters: ProcessedCharacter[][];
  selections: Record<string, (ProcessedCharacter | null)[]>;
  lastUpdated: string | null;
}

function App() {
  const [apiKey, setApiKey] = useState<string>('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showUpdatesModal, setShowUpdatesModal] = useState(false);
  
  // Presets State (Source of Truth)
  const [presets, setPresets] = useState<Preset[]>(() => {
    const saved = localStorage.getItem('lostark_presets_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse presets", e);
      }
    }

    // Migration or Default Initialization
    const oldNicknames = JSON.parse(localStorage.getItem('lostark_nicknames') || '["", ""]');
    const oldRosters = JSON.parse(localStorage.getItem('lostark_rosters') || '[]');
    const oldLastUpdated = localStorage.getItem('lostark_last_updated');
    
    // Check for old presets format and migrate if necessary
    const oldPresets = localStorage.getItem('lostark_presets');
    if (oldPresets) {
      try {
        const parsedOld = JSON.parse(oldPresets);
        if (Array.isArray(parsedOld) && parsedOld.length > 0) {
          return parsedOld.map((p: any, idx: number) => ({
            id: `migrated-${idx}-${Date.now()}`,
            name: p.name || `파티 ${idx + 1}`,
            nicknames: p.nicknames || ['', ''],
            rosters: [],
            selections: {},
            lastUpdated: null
          }));
        }
      } catch (e) {}
    }

    return [{
      id: 'default',
      name: '새 파티',
      nicknames: oldNicknames,
      rosters: oldRosters,
      selections: {},
      lastUpdated: oldLastUpdated
    }];
  });

  const [activePresetId, setActivePresetId] = useState<string>(presets[0]?.id || 'default');

  // Current Workspace State (Initialized from active preset)
  const activePreset = presets.find(p => p.id === activePresetId) || presets[0];
  
  const [nicknames, setNicknames] = useState<string[]>(activePreset.nicknames);
  const [searchedNicknames, setSearchedNicknames] = useState<string[]>(activePreset.nicknames.filter(n => n.trim()));
  const [rosters, setRosters] = useState<ProcessedCharacter[][]>(activePreset.rosters);
  const [selections, setSelections] = useState<Record<string, (ProcessedCharacter | null)[]>>(activePreset.selections || {});
  const [lastUpdated, setLastUpdated] = useState<string | null>(activePreset.lastUpdated);
  
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('lostark_theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });
  
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [isStrictFilter, setIsStrictFilter] = useState<boolean>(() => {
    return localStorage.getItem('lostark_strict_filter') === 'true';
  });

  const [showAllServers, setShowAllServers] = useState<boolean>(() => {
    return localStorage.getItem('lostark_show_all_servers') === 'true';
  });

  // Load Settings on mount
  useEffect(() => {
    const storedKey = localStorage.getItem('lostark_api_key');
    const hasVisited = localStorage.getItem('lostark_visited');
    
    if (storedKey) {
      setApiKey(storedKey);
    }

    if (!hasVisited) {
      setShowAboutModal(true);
      localStorage.setItem('lostark_visited', 'true');
    } else if (!storedKey) {
      // 이미 방문한 적은 있지만 API Key가 없는 경우에만 설정 모달을 자동으로 띄움
      setShowKeyModal(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('lostark_theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    if (sessionStorage.getItem('lostark_reset_complete') === 'true') {
      setToastMessage('데이터가 성공적으로 초기화되었습니다.');
      sessionStorage.removeItem('lostark_reset_complete');
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('lostark_presets_v2', JSON.stringify(presets));
    } catch (e) {
      console.error("Failed to save presets to local storage (quota exceeded?)", e);
    }
  }, [presets]);

  useEffect(() => {
    localStorage.setItem('lostark_show_all_servers', String(showAllServers));
  }, [showAllServers]);

  useEffect(() => {
    localStorage.setItem('lostark_strict_filter', String(isStrictFilter));
  }, [isStrictFilter]);

  // Sync current workspace to active preset
  useEffect(() => {
    setPresets(prev => prev.map(p => 
      p.id === activePresetId ? { ...p, nicknames, rosters, selections, lastUpdated } : p
    ));
  }, [nicknames, rosters, selections, lastUpdated, activePresetId]);

  const handleSaveSettings = (key: string, showAll: boolean) => {
    let cleanedKey = key.trim();
    
    // Handle if user pasted "Authorization: bearer ..." full string
    if (cleanedKey.toLowerCase().startsWith('authorization:')) {
      const parts = cleanedKey.split(':');
      if (parts.length > 1) {
        cleanedKey = parts[1].trim();
      }
    }

    // Remove "bearer " prefix (case insensitive)
    if (cleanedKey.toLowerCase().startsWith('bearer ')) {
      cleanedKey = cleanedKey.slice(7);
    }
    
    cleanedKey = cleanedKey.replace(/\s+/g, '');

    localStorage.setItem('lostark_api_key', cleanedKey);
    localStorage.setItem('lostark_show_all_servers', String(showAll));
    
    setApiKey(cleanedKey);
    setShowAllServers(showAll);
    setShowKeyModal(false);
  };

  const handleResetData = (keepApiKey: boolean) => {
    const message = keepApiKey 
      ? 'API Key를 제외한 모든 데이터를 삭제하시겠습니까?\n저장된 프리셋과 캐시가 삭제됩니다.'
      : '정말로 모든 데이터를 삭제하시겠습니까?\nAPI Key와 저장된 모든 프리셋이 삭제되며, 이 작업은 되돌릴 수 없습니다.';

    if (window.confirm(message)) {
      if (!keepApiKey) localStorage.removeItem('lostark_api_key');
      localStorage.removeItem('lostark_presets_v2');
      localStorage.removeItem('lostark_presets');
      localStorage.removeItem('lostark_nicknames');
      localStorage.removeItem('lostark_rosters');
      localStorage.removeItem('lostark_last_updated');
      localStorage.removeItem('lostark_searched_nicknames');
      localStorage.removeItem('lostark_theme');
      localStorage.removeItem('lostark_show_all_servers');
      localStorage.removeItem('lostark_strict_filter');
      localStorage.removeItem('lostark_visited');
      sessionStorage.setItem('lostark_reset_complete', 'true');
      window.location.reload();
    }
  };

  const handleAddNickname = () => {
    if (nicknames.length >= 8) return;
    setNicknames([...nicknames, '']);
  };

  const handleRemoveNickname = (index: number) => {
    if (nicknames.length <= 1) return;
    const newNicknames = nicknames.filter((_, i) => i !== index);
    setNicknames(newNicknames);
  };

  const handleNicknameChange = (index: number, value: string) => {
    const newNicknames = [...nicknames];
    newNicknames[index] = value;
    setNicknames(newNicknames);
  };

  const handleAddPreset = () => {
    const newId = Date.now().toString();
    const newPreset: Preset = {
      id: newId,
      name: '새 파티',
      nicknames: ['', ''],
      rosters: [],
      selections: {},
      lastUpdated: null
    };
    setPresets([...presets, newPreset]);
    handleSwitchPreset(newId, [...presets, newPreset]);
  };

  const handleSwitchPreset = (id: string, currentPresets = presets) => {
    const target = currentPresets.find(p => p.id === id);
    if (target) {
      setActivePresetId(id);
      setNicknames(target.nicknames);
      setRosters(target.rosters);
      setSelections(target.selections);
      setLastUpdated(target.lastUpdated);
      setSearchedNicknames(target.nicknames.filter(n => n.trim()));
    }
  };

  const handleRemovePreset = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (presets.length <= 1) return;
    
    const newPresets = presets.filter(p => p.id !== id);
    setPresets(newPresets);
    
    if (activePresetId === id) {
      handleSwitchPreset(newPresets[0].id, newPresets);
    }
  };

  const handleRenamePreset = (id: string, newName: string) => {
    setPresets(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p));
  };

  const processRosterData = (characters: ProcessedCharacter[]) => {
    if (!characters || characters.length === 0) return [];

    let filteredChars = characters;

    // 1. 캐릭터가 제일 많은 서버 찾기 (옵션이 꺼져있을 때만 수행)
    if (!showAllServers) {
      const serverCounts: Record<string, number> = {};
      characters.forEach((c) => {
        const server = c.ServerName || 'Unknown';
        serverCounts[server] = (serverCounts[server] || 0) + 1;
      });

      let maxServer = '';
      let maxCount = -1;
      Object.entries(serverCounts).forEach(([server, count]) => {
        if (count > maxCount) {
          maxCount = count;
          maxServer = server;
        }
      });

      filteredChars = characters.filter((c) => c.ServerName === maxServer);
    }

    // 2. 데이터 가공
    return filteredChars
      .filter(char => parseLevel(char.ItemMaxLevel) >= 1640) // 1640 미만 캐릭터는 제외
      .map(char => {
      const itemLevel = parseLevel(char.ItemMaxLevel);
      const allEligible = FLAT_RAID_LIST.filter(r => itemLevel >= r.level);
      
      const uniqueRaids: any[] = [];
      const seenNames = new Set<string>();

      for (const raid of allEligible) {
        if (!seenNames.has(raid.name)) {
          uniqueRaids.push(raid);
          seenNames.add(raid.name);
        }
      }
      
      return { 
        ...char, 
        availableRaids: uniqueRaids,
        parsedItemLevel: itemLevel,
        parsedCombatPower: parseCombatPower(char.CombatPower || '0'),
        role: getRole(char.CharacterClassName)
      } as ProcessedCharacter;
    });
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!apiKey) {
      setShowKeyModal(true);
      return;
    }
    
    const validNicknames = nicknames.map(n => n.trim()).filter(n => n);
    if (validNicknames.length === 0) return;

    setLoading(true);
    setError(null);
    setUsingMockData(false);
    setProgress(0);

    const progressTracker: Record<string, { current: number; total: number }> = {};
    validNicknames.forEach(n => progressTracker[n] = { current: 0, total: 1 });

    const updateProgress = (nick: string, current: number, total: number) => {
      progressTracker[nick] = { current, total };
      const values = Object.values(progressTracker);
      const sumCurrent = values.reduce((acc, curr) => acc + curr.current, 0);
      const sumTotal = values.reduce((acc, curr) => acc + curr.total, 0);
      setProgress(Math.floor((sumCurrent / sumTotal) * 100));
    };

    try {
      const promises = validNicknames.map(nick => 
        fetchSiblings(nick, apiKey, (curr, tot) => updateProgress(nick, curr, tot))
      );
      const results = await Promise.all(promises);
      
      const processedRosters = results.map(processRosterData);
      const now = new Date().toLocaleString();
      
      setRosters(processedRosters);
      setSearchedNicknames(validNicknames);
      setLastUpdated(now);

      // Check if we fell back to mock data (simple heuristic: if proxy is empty and we got data, likely mock in this env)
      if (results.some(r => r.length > 0)) {
          setUsingMockData(true);
      }

    } catch (err: any) {
      setError(err.message || '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 매칭 결과 계산 (Raid-centric)
  const { matches, excluded } = useMemo(() => {
    const activeRosters = rosters.filter(r => r.length > 0);
    if (activeRosters.length < 1) return { matches: [], excluded: [] };

    return getGroupedRaidMatches(rosters);
  }, [rosters]);

  const handleToggleSelection = useCallback((raidId: string, pIdx: number, char: ProcessedCharacter) => {
    setSelections(prev => {
      const newSelections = { ...prev };
      const isSelecting = !(prev[raidId]?.[pIdx]?.CharacterName === char.CharacterName);

      // 1. 캐릭터를 새로 선택하는 경우, 다른 모든 레이드에서 해당 캐릭터의 선택을 해제 (중복 입장 방지)
      if (isSelecting) {
        Object.keys(newSelections).forEach(id => {
          if (newSelections[id]) {
            newSelections[id] = newSelections[id].map(c => 
              c?.CharacterName === char.CharacterName ? null : c
            );
          }
        });
      }

      // 2. 현재 레이드 슬롯에 캐릭터 할당 또는 해제
      const currentRaidSelections = newSelections[raidId] ? [...newSelections[raidId]] : [];
      currentRaidSelections[pIdx] = isSelecting ? char : null;
      newSelections[raidId] = currentRaidSelections;
      
      return newSelections;
    });
  }, []);

  const handleDeselectAll = useCallback((raidId: string) => {
    setSelections(prev => {
      const next = { ...prev };
      delete next[raidId];
      return next;
    });
  }, []);

  // 레이드 데이터를 탭 단위로 그룹화 (1680 기준)
  const groupedTabs = useMemo(() => {
    // 사용자가 원하는 탭 순서 정의
    const mainRaidOrder = MAIN_TAB_RAIDS;
    
    const tabMap: Record<string, GroupedMatch[]> = {};
    
    const filteredMatches = selectedLevel 
      ? matches.filter(m => ((m as any).level || 0) >= selectedLevel)
      : matches;

    filteredMatches.forEach(match => {
      // 메인 레이드 목록에 포함되어 있는지 확인 (이름 포함 여부로 판단)
      const mainRaidName = mainRaidOrder.find(name => match.raidName.includes(name));
      const tabName = mainRaidName || "그 외 레이드";
      
      if (!tabMap[tabName]) tabMap[tabName] = [];
      tabMap[tabName].push(match);
    });

    // 정의된 순서대로 결과 배열 생성 (데이터가 있는 경우만)
    const result = mainRaidOrder
      .filter(name => tabMap[name])
      .map(name => ({ name, matches: tabMap[name] }));

    // Whitelist에 없는 레이드(베히모스, 에키드나 등)는 마지막에 추가
    if (tabMap["그 외 레이드"]) {
      result.push({ name: "그 외 레이드", matches: tabMap["그 외 레이드"] });
    }

    return result;
  }, [matches, selectedLevel]);

  // 검색 결과가 갱신될 때 첫 번째 탭을 활성화
  useEffect(() => {
    if (groupedTabs.length > 0 && (!activeTab || !groupedTabs.find(t => t.name === activeTab))) {
      setActiveTab(groupedTabs[0].name);
    }
  }, [groupedTabs, activeTab]);

  return (
    <div className={`min-h-screen font-sans pb-10 transition-colors duration-300 ${theme === 'dark' ? 'bg-gray-950 text-gray-100 selection:bg-lostark-gold selection:text-black' : 'bg-gray-100 text-gray-900 selection:bg-yellow-400 selection:text-black'}`}>
      <ApiKeyModal isOpen={showKeyModal} onSave={handleSaveSettings} />

      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center shadow-lg shadow-yellow-500/20">
              <span className="text-lg leading-none pt-0.5">⚔️</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
              로아 <span className="text-yellow-600 dark:text-lostark-gold">스쿼드</span>
            </h1>
          </div>
            
          <div className="flex items-center gap-2">
              <button
                  onClick={() => setShowUpdatesModal(true)}
                  className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
                  title="업데이트 내역"
              >
                  <History className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white hidden sm:inline">업데이트</span>
              </button>
              <button
                  onClick={() => setShowAboutModal(true)}
                  className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
                  title="도움말"
              >
                  <HelpCircle className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white hidden sm:inline">도움말</span>
              </button>
              <button
                  onClick={() => setShowKeyModal(true)}
                  className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
                  title="설정"
              >
                  <Settings className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white hidden sm:inline">설정</span>
              </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-6">
        {/* Search Bar */}
        <div className="mb-6">
          <ApiKeyModal 
            isOpen={showKeyModal} 
            onSave={handleSaveSettings} 
            initialApiKey={apiKey}
            initialShowAllServers={showAllServers}
            onClose={() => setShowKeyModal(false)}
            theme={theme}
            onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            onResetData={handleResetData}
          />
          {/* Browser Tabs */}
          <div className="flex items-end gap-1 px-2 overflow-x-auto flex-nowrap scrollbar-hide">
            {presets.map(preset => (
              <div
                key={preset.id}
                onClick={() => handleSwitchPreset(preset.id)}
                onDoubleClick={() => setEditingTabId(preset.id)}
                className={`group relative flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-t-xl cursor-pointer transition-all min-w-[120px] max-w-[200px] border-t border-l border-r ${
                  activePresetId === preset.id
                    ? 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-yellow-600 dark:text-lostark-gold font-bold z-10 -mb-[1px] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]'
                    : 'bg-gray-100 dark:bg-gray-950 border-transparent text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-900 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {editingTabId === preset.id ? (
                  <input
                    type="text"
                    autoFocus
                    defaultValue={preset.name}
                    onBlur={(e) => {
                      handleRenamePreset(preset.id, e.target.value || '새 파티');
                      setEditingTabId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleRenamePreset(preset.id, e.currentTarget.value || '새 파티');
                        setEditingTabId(null);
                      }
                    }}
                    className="bg-transparent border-none outline-none w-full text-sm font-bold p-0"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <span className="text-sm truncate select-none flex-1">{preset.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTabId(preset.id);
                      }}
                      className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="이름 수정"
                    >
                      <Edit2 className="w-3 h-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" />
                    </button>
                  </>
                )}
                
                {presets.length > 1 && (
                  <button
                    onClick={(e) => handleRemovePreset(e, preset.id)}
                    className={`p-0.5 rounded-full hover:bg-gray-300 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity ${activePresetId === preset.id ? 'opacity-100' : ''}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={handleAddPreset}
              className="flex-shrink-0 p-2 mb-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="새 파티 추가"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl rounded-tl-none p-6 shadow-xl relative overflow-hidden transition-colors duration-300">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/10 dark:bg-lostark-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <form onSubmit={handleSearch} className="flex flex-col gap-4 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {nicknames.map((nick, idx) => (
                <div key={idx} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">참가자 {idx + 1} 닉네임</label>
                    <input
                      type="text"
                      value={nick}
                      onChange={(e) => handleNicknameChange(idx, e.target.value)}
                      placeholder="캐릭터명 입력"
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-400 dark:focus:ring-lostark-gold focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  {nicknames.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveNickname(idx)}
                      className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors mb-[1px]"
                      title="삭제"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
              
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={handleAddNickname}
                  disabled={nicknames.length >= 8}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 border-dashed text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-400 dark:hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center justify-center gap-2 transition-all h-[42px]"
                >
                  <Plus className="w-5 h-5" /> {nicknames.length >= 8 ? '최대 인원(8명)' : '인원 추가'}
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center mt-2 gap-4">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {lastUpdated && (
                  <span className="flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> 마지막 갱신: {lastUpdated}
                  </span>
                )}
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <button
                  type="submit"
                  disabled={loading || nicknames.every(n => !n.trim())}
                  className="flex-1 md:flex-none px-6 py-2 bg-yellow-400 dark:bg-lostark-gold hover:bg-yellow-500 dark:hover:bg-yellow-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 text-gray-900 font-bold rounded-lg flex items-center justify-center gap-2 transition-all min-w-[120px]"
                >
                  {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  {rosters.length > 0 ? '갱신하기' : '조회하기'}
                </button>
              </div>
            </div>

            {loading && (
              <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">캐릭터 정보를 불러오는 중...</span>
                  <span className="text-sm font-bold text-yellow-600 dark:text-lostark-gold">{progress}%</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-yellow-400 dark:bg-lostark-gold h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </form>
          </div>
          
          <div className="mt-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 text-xs text-gray-500 relative z-10">
            <div className="flex items-center gap-2">
                <AlertCircle className="w-3 h-3" />
                <span>아이템 레벨 1640 이상 캐릭터만 조회됩니다.</span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-200 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            {error}
            <button 
              onClick={() => setShowKeyModal(true)}
              className="ml-auto text-xs bg-red-800 hover:bg-red-700 text-white px-3 py-1.5 rounded-md font-medium"
            >
              설정 열기
            </button>
          </div>
        )}

        <div className="mb-10">
          {matches.length > 0 && (
            <div className="flex flex-wrap items-center gap-y-4 gap-x-6 mb-6 px-1">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400 mr-2 flex-shrink-0">레벨 필터:</span>
                <button
                  onClick={() => setSelectedLevel(null)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
                    selectedLevel === null
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent'
                      : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  전체
                </button>
                {metadata.raidLevels?.map((level) => (
                  <button
                    key={level}
                    onClick={() => setSelectedLevel(level)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
                      selectedLevel === level
                        ? 'bg-yellow-400 dark:bg-lostark-gold text-gray-900 border-transparent shadow-sm'
                        : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  >
                    {level}+
                  </button>
                ))}
              </div>

              {selectedLevel && (
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={isStrictFilter}
                      onChange={(e) => setIsStrictFilter(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 dark:bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-500"></div>
                  </div>
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                    해당 레벨대만 보기
                  </span>
                </label>
              )}
            </div>
          )}

          {/* Eligible Characters Summary for Selected Level */}
          {selectedLevel && rosters.length > 0 && (
            <div className="mb-8 p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm animate-in fade-in slide-in-from-top-2 transition-colors duration-300">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-yellow-500" />
                <h3 className="font-bold text-gray-900 dark:text-white">
                  {selectedLevel}{isStrictFilter ? ' 레벨대' : '+'} 참여 가능 캐릭터 현황
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {searchedNicknames.map((nick, idx) => {
                  const eligibleChars = rosters[idx]?.filter(c => {
                    const lvl = c.parsedItemLevel;
                    if (lvl < selectedLevel) return false;
                    if (isStrictFilter) {
                      const sortedLevels = [...metadata.raidLevels].sort((a, b) => a - b);
                      const currentIndex = sortedLevels.indexOf(selectedLevel);
                      const nextLevel = sortedLevels[currentIndex + 1];
                      if (nextLevel && lvl >= nextLevel) return false;
                    }
                    return true;
                  }) || [];
                  if (eligibleChars.length === 0) return null;
                  
                  return (
                    <div key={idx} className="flex flex-col gap-2">
                      <div className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800 pb-1">
                        {nick}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {eligibleChars.map(char => (
                          <div key={char.CharacterName} className="flex items-center justify-between group">
                            {/* 서포터 여부 판별 (role 속성 또는 직업명 직접 체크) */}
                            {(() => {
                              const isSupporter = char.role?.toUpperCase() === 'SUPPORTER' || ['바드', '홀리나이트', '도화가'].includes(char.CharacterClassName);
                              return (
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1">
                                {isSupporter ? (
                                  <>
                                    <Shield className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 fill-blue-500/10" title="서포터" />
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200 group-hover:text-yellow-600 dark:group-hover:text-lostark-gold transition-colors">
                                      {char.CharacterName}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <Swords className="w-3.5 h-3.5 text-red-500 dark:text-red-400 fill-red-500/10" title="딜러" />
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200 group-hover:text-yellow-600 dark:group-hover:text-lostark-gold transition-colors">
                                      {char.CharacterName}
                                    </span>
                                  </>
                                )}
                              </div>
                              <span className="text-[10px] text-gray-500">{char.CharacterClassName}</span>
                            </div>
                              );
                            })()}
                            <span className="text-xs font-mono font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                              {char.ItemMaxLevel}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {groupedTabs.length > 0 ? (
            <>
              {/* Chrome-style Tabs */}
              <div className="flex items-end gap-1 mb-6 border-b border-gray-200 dark:border-gray-800 px-2 overflow-x-auto flex-nowrap scrollbar-hide">
                {groupedTabs.map((tab) => (
                  <button
                    key={tab.name}
                    onClick={() => setActiveTab(tab.name)}
                    className={`relative flex-shrink-0 px-6 py-2.5 text-sm font-bold rounded-t-lg flex items-center gap-2 min-w-[120px] justify-center border-t border-l border-r transition-colors ${
                      activeTab === tab.name
                      ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-t border-l border-r border-gray-200 dark:border-gray-800 z-10 -mb-[1px]'
                        : 'bg-gray-100 dark:bg-gray-950 text-gray-500 border-transparent hover:bg-gray-200 dark:hover:bg-gray-900/50 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {tab.name === "그 외 레이드" ? <Users className="w-3.5 h-3.5 opacity-50" /> : null}
                    {tab.name}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="space-y-10 min-h-[600px]">
                {groupedTabs.find(t => t.name === activeTab)?.matches.map((match) => (
                  <RaidCard
                    key={match.raidId}
                    match={match}
                    searchedNicknames={searchedNicknames}
                    selections={selections[match.raidId] || []}
                    onToggleSelection={handleToggleSelection}
                    onDeselectAll={handleDeselectAll}
                  />
                ))}

                {excluded.length > 0 && (
                  <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
                    <h3 className="text-lg font-bold text-gray-400 mb-6 flex items-center gap-2">
                      <Ban className="w-5 h-5" /> 매칭 제외 캐릭터 ({excluded.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {excluded.map((item, idx) => (
                        <div key={idx} className="bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800 p-4 rounded-lg flex flex-col gap-2 opacity-60 hover:opacity-100 transition-opacity">
                          {/* 서포터 여부 판별 */}
                          {(() => {
                            const isSupporter = item.character.role?.toUpperCase() === 'SUPPORTER' || ['바드', '홀리나이트', '도화가'].includes(item.character.CharacterClassName);
                            return (
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1">
                              {isSupporter ? (
                                <Shield className="w-3.5 h-3.5 text-blue-500/70" />
                              ) : (
                                <Swords className="w-3.5 h-3.5 text-red-500/70" />
                              )}
                              <span className="font-medium text-gray-700 dark:text-gray-300">
                                {item.character.CharacterName}
                              </span>
                            </div>
                            <span className="text-xs bg-white dark:bg-gray-800 px-2 py-0.5 rounded text-gray-500">{item.character.ItemMaxLevel}</span>
                          </div>
                            );
                          })()}
                          <div className="text-xs text-red-400/80 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {item.reason}</div>
                          <div className="text-xs text-gray-600 font-mono">CP: {formatCombatPower(item.power)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500 bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 border-dashed">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>{rosters.length > 0 ? "조건에 맞는 매칭 결과가 없습니다." : "닉네임을 입력하고 조회하기 버튼을 눌러주세요."}</p>
            </div>
          )}
        </div>
      </main>

      {/* About Modal */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h3 className="font-bold text-xl flex items-center gap-2 text-gray-900 dark:text-white">
                <Info className="w-5 h-5 text-yellow-500" /> 로아 스쿼드란?
              </h3>
              <button onClick={() => setShowAboutModal(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <section>
                <h4 className="text-sm font-black text-yellow-600 dark:text-lostark-gold uppercase tracking-widest mb-3">제작 의도</h4>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  "고정 공대원들과 매주 레이드를 갈 때, 캐릭터가 레벨업을 하면 갈 수 있는 곳이 많아지기도 하고 때로는 굳이 안 가도 되는 레이드가 생기기도 하죠. <br/><br/>
                  <strong>로아 스쿼드</strong>는 이러한 변화를 한눈에 파악하여, 우리 공대원들이 이번 주에 <strong>함께 갈 수 있는 레이드</strong>가 무엇인지 쉽게 찾기 위해 만들어졌습니다."
                </p>
              </section>
              
              <section className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">간단 사용법</h4>
                <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-2">
                  <li className="flex gap-2">
                    <span className="text-yellow-500 font-bold">1.</span>
                    <span>우측 상단 <strong>설정</strong>에서 본인의 API 키를 등록하세요.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-yellow-500 font-bold">2.</span>
                    <span>함께할 공대원들의 <strong>캐릭터명</strong>을 입력하고 조회하세요.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-yellow-500 font-bold">3.</span>
                    <span>레이드 탭을 넘겨보며 참여할 캐릭터를 클릭해 <strong>조합을 확인</strong>해보세요.</span>
                  </li>
                </ul>
              </section>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-gray-900/50 text-center">
              <button onClick={() => setShowAboutModal(false)} className="px-8 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-lg hover:opacity-90 transition-all">확인</button>
            </div>
          </div>
        </div>
      )}

      {/* Updates Modal */}
      {showUpdatesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h3 className="font-bold text-xl flex items-center gap-2 text-gray-900 dark:text-white">
                <History className="w-5 h-5 text-yellow-500" /> 업데이트 내역
              </h3>
              <button onClick={() => setShowUpdatesModal(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto scrollbar-hide">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-yellow-600 dark:text-lostark-gold">v1.1.0</span>
                  <span className="text-xs text-gray-400">2025.12.31</span>
                </div>
                <ul className="text-sm text-gray-600 dark:text-gray-300 list-disc list-inside space-y-2 pl-1 leading-relaxed">
                  <li>아이템 레벨별 레이드 탭 그룹화 기능 추가</li>
                </ul>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-yellow-600 dark:text-lostark-gold">v1.0.0</span>
                  <span className="text-xs text-gray-400">2025.12.31</span>
                </div>
                <ul className="text-sm text-gray-600 dark:text-gray-300 list-disc list-inside space-y-2 pl-1 leading-relaxed">
                  <li>로아 스쿼드(LOA SQUAD) 출시</li>
                </ul>
              </div>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-gray-900/50 text-center">
              <button onClick={() => setShowUpdatesModal(false)} className="px-8 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-lg hover:opacity-90 transition-all">확인</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Check className="w-5 h-5" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default App;