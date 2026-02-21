import './Chat.css';

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now  = new Date();
  const diff = now - date;
  if (diff < 60000)    return 'maintenant';
  if (diff < 3600000)  return Math.floor(diff / 60000) + 'm';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
};

const getLastMessagePreview = (msg) => {
  if (!msg) return '';
  if (msg.type === 'voice') return '🎤 Message vocal';
  if (msg.type === 'image') return '🖼️ Image';
  if (msg.type === 'file')  return '📎 ' + (msg.fileName || 'Fichier');
  return msg.content || '';
};

const UserList = ({
  users = [],
  onlineUsers = [],
  selectedUser,
  onSelectUser,
  unreadCounts = {},
  lastMessages = {},
}) => {
  return (
    <div className="user-list">
      <h3 className="user-list-title">Messages</h3>
      {users.length === 0 && <p className="no-users">Aucun utilisateur</p>}
      {users.map((u) => {
        const isOnline   = onlineUsers.includes(u._id);
        const isSelected = selectedUser && selectedUser._id === u._id;
        const unread     = unreadCounts[u._id] || 0;
        const lastMsg    = lastMessages[u._id];
        const hasUnread  = unread > 0;

        return (
          <div
            key={u._id}
            className={
              'user-item' +
              (isSelected ? ' selected' : '') +
              (hasUnread  ? ' has-unread' : '')
            }
            onClick={() => onSelectUser(u)}
          >
            <div className="user-avatar gradient-bg">
              {u.username[0].toUpperCase()}
              <span className={'status-dot ' + (isOnline ? 'online' : 'offline')} />
            </div>

            <div className="user-details">
              <div className="user-row-top">
                <span className={'user-name' + (hasUnread ? ' user-name-bold' : '')}>
                  {u.username}
                </span>
                {lastMsg && (
                  <span className={'last-msg-time' + (hasUnread ? ' time-unread' : '')}>
                    {formatTime(lastMsg.createdAt)}
                  </span>
                )}
              </div>
              <div className="user-row-bottom">
                <span className={'last-message-preview' + (hasUnread ? ' preview-unread' : '')}>
                  {getLastMessagePreview(lastMsg) || (isOnline ? 'En ligne' : 'Hors ligne')}
                </span>
                {hasUnread && (
                  <span className="unread-badge">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default UserList;