import React, { useState, useEffect } from 'react';
import { Select } from '@superset-ui/core/components'; 
import { Button } from '@superset-ui/core/components';
import { Icons } from '@superset-ui/core/components/';
import { useToasts } from 'src/components/MessageToasts/withToasts';
import { SupersetClient } from '@superset-ui/core';

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#fff',
    padding: '24px',
    margin: '24px',
    borderRadius: '4px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
    maxWidth: '1000px',
  },
  header: {
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '20px',
    fontWeight: 600,
  },
  section: {
    marginBottom: '30px',
    padding: '20px',
    border: '1px solid #f0f0f0',
    borderRadius: '4px',
    backgroundColor: '#fafafa'
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: '15px',
    textTransform: 'uppercase',
    fontSize: '12px',
    color: '#888',
    letterSpacing: '0.5px'
  },
  label: { 
    display: 'block', 
    fontWeight: 'bold', 
    fontSize: '12px',
    marginBottom: '6px',
    color: '#333'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '15px',
    marginBottom: '15px'
  },
  input: {
    width: '100%',
    padding: '6px 12px',
    height: '36px',
    borderRadius: '4px',
    border: '1px solid #d9d9d9',
    fontSize: '14px'
  },
  // Стили для переключателя режимов
  modeToggle: {
      display: 'flex',
      gap: '10px',
      marginBottom: '15px'
  },
  modeBtn: {
      flex: 1,
      padding: '10px',
      border: '1px solid #d9d9d9',
      borderRadius: '4px',
      textAlign: 'center' as const,
      cursor: 'pointer',
      fontWeight: 'bold',
      transition: 'all 0.2s'
  },
  modeBtnActive: {
      borderColor: '#20a7c9',
      backgroundColor: '#e6f7ff',
      color: '#0050b3'
  },
  modeBtnRemove: {
      borderColor: '#ffa39e',
      backgroundColor: '#fff1f0',
      color: '#cf1322'
  }
};

export default function BulkRolePage() {
  const [allRoles, setAllRoles] = useState<any[]>([]);
  const [targetRole, setTargetRole] = useState<number | null>(null);
  
  // Режим работы: 'assign' (выдать) или 'unassign' (отозвать)
  const [mode, setMode] = useState<'assign' | 'unassign'>('assign');

  // Фильтры
  const [fUsername, setFUsername] = useState('');
  const [fFirstName, setFFirstName] = useState('');
  const [fLastName, setFLastName] = useState('');
  const [fEmail, setFEmail] = useState('');
  const [fRole, setFRole] = useState<number | null>(null);
  
  // Данные
  const [foundUsers, setFoundUsers] = useState<any[]>([]);      
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]); 
  
  const [searching, setSearching] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { addSuccessToast, addDangerToast, addInfoToast } = useToasts();

  useEffect(() => {
    SupersetClient.get({ endpoint: '/bulkrole/api/roles/' })
      .then(({ json }) => setAllRoles(json.result))
      .catch(() => addDangerToast('Ошибка загрузки ролей'));
  }, []);

  const handleSearchUsers = async () => {
    if (!fUsername && !fFirstName && !fLastName && !fEmail && !fRole) {
        addInfoToast('Заполните хотя бы одно поле фильтра');
        return;
    }
    setSearching(true);
    setSelectedUsers([]); 
    try {
      const params = new URLSearchParams();
      if (fUsername) params.append('username', fUsername);
      if (fFirstName) params.append('first_name', fFirstName);
      if (fLastName)  params.append('last_name', fLastName);
      if (fEmail)     params.append('email', fEmail);
      if (fRole)      params.append('role_id', fRole.toString());

      const { json } = await SupersetClient.get({
        endpoint: `/bulkrole/api/search_users/?${params.toString()}`
      });

      setFoundUsers(json.options);
      if (json.options.length === 0) addInfoToast('По вашему запросу никто не найден');
      else addSuccessToast(`Найдено: ${json.options.length}`);
    } catch (e) {
      console.error(e);
      addDangerToast('Ошибка при поиске');
    } finally {
      setSearching(false);
    }
  };

  const handleExecute = () => {
    if (!targetRole || selectedUsers.length === 0) return;
    setProcessing(true);

    // Выбираем Endpoint в зависимости от режима
    const endpoint = mode === 'assign' 
        ? '/bulkrole/api/assign/' 
        : '/bulkrole/api/unassign/';

    SupersetClient.post({
      endpoint: endpoint,
      body: JSON.stringify({ role_id: targetRole, user_ids: selectedUsers }),
      headers: { 'Content-Type': 'application/json' },
    })
      .then(({ json }) => {
        const actionName = mode === 'assign' ? 'выдана' : 'отозвана у';
        addSuccessToast(`Успешно! Роль ${actionName} ${json.count} пользователей`);
        setSelectedUsers([]);
      })
      .catch((err) => addDangerToast('Ошибка выполнения операции'))
      .finally(() => setProcessing(false));
  };

  const handleSelectAll = () => setSelectedUsers(foundUsers.map(u => u.value));
  const onKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSearchUsers(); };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Icons.Ballot /> Менеджер Ролей
      </div>

      {/* ШАГ 1 */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Шаг 1: Поиск пользователей</div>
        <div style={styles.grid}>
            <div>
                <label style={styles.label}>Username</label>
                <input style={styles.input} placeholder="IvanovII" 
                       value={fUsername} onChange={e => setFUsername(e.target.value)} onKeyDown={onKeyDown}/>
            </div>
            <div>
                <label style={styles.label}>Email</label>
                <input style={styles.input} placeholder="ivanovii@rusal.com" 
                       value={fEmail} onChange={e => setFEmail(e.target.value)} onKeyDown={onKeyDown}/>
            </div>
            <div>
                <label style={styles.label}>Имеют роль</label>
                <Select options={allRoles} value={fRole} onChange={(val) => setFRole(val as number)} placeholder="Любая..." allowClear />
            </div>
            <div>
                <label style={styles.label}>Имя</label>
                <input style={styles.input} placeholder="Иван" value={fFirstName} onChange={e => setFFirstName(e.target.value)} onKeyDown={onKeyDown}/>
            </div>
            <div>
                <label style={styles.label}>Фамилия</label>
                <input style={styles.input} placeholder="Иванов" value={fLastName} onChange={e => setFLastName(e.target.value)} onKeyDown={onKeyDown}/>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <Button buttonStyle="secondary" onClick={handleSearchUsers} loading={searching} disabled={searching} style={{ width: '100%' }}>
                    Найти
                </Button>
            </div>
        </div>
      </div>

      {/* ШАГ 2 */}
      <div style={styles.section}>
        <div style={{...styles.sectionTitle, display: 'flex', justifyContent: 'space-between'}}>
            <span>Шаг 2: Выбор ({foundUsers.length})</span>
            {foundUsers.length > 0 && (
                 <a href="#" onClick={(e) => { e.preventDefault(); handleSelectAll(); }} style={{textTransform: 'none'}}>[ Выбрать всех ]</a>
            )}
        </div>
        <Select
            mode="multiple" allowClear
            placeholder={foundUsers.length === 0 ? "Сначала нажмите Найти..." : "Выберите пользователей..."}
            options={foundUsers} value={selectedUsers} onChange={(val) => setSelectedUsers(val as number[])}
            filterOption={true} notFoundContent="Список пуст"
        />
      </div>

      {/* ШАГ 3: ДЕЙСТВИЕ */}
      {/* Меняем цвет фона в зависимости от режима (синий для добавления, красноватый для удаления) */}
      <div style={{
          ...styles.section, 
          backgroundColor: mode === 'assign' ? '#e6f7ff' : '#fff1f0', 
          borderColor: mode === 'assign' ? '#91d5ff' : '#ffa39e'
      }}>
         <div style={{
             ...styles.sectionTitle, 
             color: mode === 'assign' ? '#0050b3' : '#cf1322'
         }}>Шаг 3: Операция</div>
         
         {/* Переключатель режимов */}
         <div style={styles.modeToggle}>
             <div 
                style={{...styles.modeBtn, ...(mode === 'assign' ? styles.modeBtnActive : {})}}
                onClick={() => setMode('assign')}
             >
                <i className="fa fa-plus-circle"/> ВЫДАТЬ РОЛЬ
             </div>
             <div 
                style={{...styles.modeBtn, ...(mode === 'unassign' ? styles.modeBtnRemove : {})}}
                onClick={() => setMode('unassign')}
             >
                <i className="fa fa-trash"/> ОТОЗВАТЬ РОЛЬ
             </div>
         </div>

         <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
                <label style={styles.label}>
                    {mode === 'assign' ? 'Какую роль добавить?' : 'Какую роль удалить у выбранных?'}
                </label>
                <Select
                    options={allRoles}
                    value={targetRole}
                    onChange={(val) => setTargetRole(val as number)}
                    placeholder="Выберите роль..."
                />
            </div>
            
            <div style={{ flex: '0 0 auto' }}>
                <Button
                    // Кнопка danger (красная), если удаляем
                    buttonStyle={mode === 'assign' ? 'primary' : 'danger'}
                    onClick={handleExecute}
                    disabled={processing || !targetRole || selectedUsers.length === 0}
                    loading={processing}
                >
                    {mode === 'assign' ? 'Выдать роль' : 'Отозвать роль'} 
                    {' '}({selectedUsers.length})
                </Button>
            </div>
         </div>
      </div>
    </div>
  );
}