import './Chat.css';

const UserList = ({ users = [], onlineUsers = [], selectedUser, onSelectUser }) => {
  return (
    <div className="user-list">
      <h3 className="user-list-title">Messages</h3>
      {users.length === 0 && (
        <p className="no-users">Aucun utilisateur</p>
      )}
      {users.map((u) => {
        const isOnline = onlineUsers.includes(u._id);
        const isSelected = selectedUser?._id === u._id;
        return (
          <div
            key={u._id}
            className={`user-item ${isSelected ? 'selected' : ''}`}
            onClick={() => onSelectUser(u)}
          >
            <div className="user-avatar">
              {u.username[0].toUpperCase()}
              <span className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
            </div>
            <div className="user-details">
              <span className="user-name">{u.username}</span>
              <span className="user-status">{isOnline ? 'En ligne' : 'Hors ligne'}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};



export default UserList;