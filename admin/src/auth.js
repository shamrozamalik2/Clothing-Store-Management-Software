export function getAdminSession() {
  const token = sessionStorage.getItem('sa_token');
  const admin = JSON.parse(sessionStorage.getItem('sa_admin') || 'null');
  return { token, admin, isAuth: !!token };
}

export function clearAdminSession() {
  sessionStorage.removeItem('sa_token');
  sessionStorage.removeItem('sa_admin');
}
