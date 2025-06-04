import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import './NotificationsPage.css';

const NotificationsPage = () => {
  const { currentUser, loading: authLoading } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('NotificationsPage useEffect - currentUser:', currentUser, 'authLoading:', authLoading);
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (!currentUser) {
      setError('Please log in to view notifications');
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchNotifications = async () => {
      try {
        console.log('Fetching notifications for userID:', currentUser?.user_id);
        const response = await fetch('http://localhost:8080/api/notifications', {
          credentials: 'include',
        });
        const data = await response.json();
        console.log('Notifications API response:', data);
        if (!isMounted) return;

        if (!data.success) {
          setError(data.message || 'Failed to load notifications');
          return;
        }
        setNotifications(data.notifications || []);
      } catch (err) {
        if (isMounted) {
          console.error('Notifications fetch error:', err.message);
          setError(err.message || 'Error fetching notifications');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchNotifications();

    return () => {
      isMounted = false;
    };
  }, [currentUser, authLoading]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      const response = await fetch(`http://localhost:8080/api/notifications/${notificationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await response.json();
      console.log('Mark as read response:', data);
      if (data.success) {
        setNotifications(notifications.map(n => 
          n.notification_id === notificationId ? { ...n, status: 'read' } : n
        ));
      } else {
        setError(data.message || 'Failed to mark notification as read');
      }
    } catch (err) {
      console.error('Mark as read error:', err.message);
      setError('Error marking notification as read');
    }
  };

  const handleRequestAction = async (followId, action) => {
    console.log('Sending follow request:', { follow_id: followId, action });
    try {
      const response = await fetch('http://localhost:8080/api/follow/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ follow_id: followId, action }),
        credentials: 'include',
      });
      const data = await response.json();
      console.log('Follow request response:', data);
      if (data.success) {
        setNotifications(notifications.filter(n => n.parent_id !== followId || n.action_type !== 'follow_request'));
      } else {
        throw new Error(data.message || `Failed to ${action} follow request`);
      }
    } catch (err) {
      console.error('Follow update error:', err.message);
      setError(err.message);
    }
  };

  const handleClearRead = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await response.json();
      console.log('Clear read response:', data);
      if (data.success) {
        setNotifications(notifications.filter(n => n.status !== 'read'));
      } else {
        setError(data.message || 'Failed to clear notifications');
      }
    } catch (err) {
      console.error('Clear notifications error:', err.message);
      setError('Error clearing notifications');
    }
  };

  const handleRetry = () => {
    setError('');
    setLoading(true);
    setNotifications([]);
  };

  if (authLoading) return <div className="loading">Loading session...</div>;
  if (!currentUser && !authLoading) return <div className="error">Please <Link to="/login">log in</Link> to view notifications</div>;
  if (loading) return <div className="loading">Loading notifications...</div>;
  if (error) return (
    <div className="error">
      Error: {error}
      <button onClick={handleRetry} className="retry-button">Retry</button>
    </div>
  );

  return (
    <div className="notifications-container">
      <h2>Notifications</h2>
      {notifications.length === 0 ? (
        <p>No notifications</p>
      ) : (
        <>
          <button className="clear-button" onClick={handleClearRead}>Clear Read Notifications</button>
          <ul className="notification-list">
            {notifications.map((notification) => (
              <li 
                key={notification.notification_id} 
                className={`notification-item ${notification.status === 'unread' ? 'unread' : ''}`}
                onClick={() => notification.status === 'unread' && handleMarkAsRead(notification.notification_id)}
              >
                <div className="notification-info">
                  {notification.avatar && (
                    <img
                      src={`http://localhost:8080/${notification.avatar}`}
                      alt={`${notification.nickname}'s avatar`}
                      className="notification-avatar"
                    />
                  )}
                  <div>
                    <Link to={`/profile/${notification.actor_uuid}`}>
                      {notification.nickname || notification.actor_uuid}
                    </Link>
                    <p>{notification.content}</p>
                    <p className="timestamp">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                {notification.action_type === 'follow_request' && (
                  <div className="notification-actions">
                    <button
                      className="accept-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRequestAction(notification.parent_id, 'accept');
                      }}
                    >
                      Accept
                    </button>
                    <button
                      className="decline-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRequestAction(notification.parent_id, 'decline');
                      }}
                    >
                      Decline
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default NotificationsPage;