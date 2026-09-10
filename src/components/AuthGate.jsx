import { FiHeadphones, FiLogIn } from 'react-icons/fi'

export default function AuthGate({ user, loading, error, ownerUid, onLogin, onLogout }) {
  const wrongAccount = user && user.uid !== ownerUid

  return (
    <main className="auth-gate">
      <div className="auth-card">
        <span className="auth-brand-mark"><FiHeadphones /></span>
        <h1>柚子音樂庫</h1>
        {loading ? (
          <p>正在確認登入狀態…</p>
        ) : wrongAccount ? (
          <>
            <p>目前登入的帳號沒有存取這個音樂庫的權限。</p>
            <button type="button" onClick={onLogout}>登出其他帳號</button>
          </>
        ) : (
          <>
            <p>這是私人音樂庫，請使用管理者 Google 帳號登入。</p>
            <button type="button" onClick={onLogin}><FiLogIn /> 使用 Google 登入</button>
          </>
        )}
        {error && <small role="alert">{error}</small>}
      </div>
    </main>
  )
}
