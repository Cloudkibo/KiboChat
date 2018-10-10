import cookie from 'react-cookie'

// If login was successful, set the token in local storage
// cookie.save('token', user.token.token, {path: '/'});
// printlogs('log', cookie.load('token'));
// browserHistory.push('/dashboard')

const auth = {
  getToken () {
    return cookie.load('token')
  },

  putCookie (val) {
    cookie.save('token', val)
  },

  putUserId (val) {
    cookie.save('userid', val)
  },

  // getNext () {
  // return cookie.load('next')
  // },

  removeNext () {
    cookie.remove('next')
  },

  logout (cb) {
    cookie.remove('userid')
    cookie.remove('token', { path: '/' })
    if (cb) cb()
    this.onChange(false)
  },

  loggedIn () {
    const token = cookie.load('token')
    // first check from server if this token is expired or is still valid
    return !(typeof token === 'undefined' || token === '')
  },

  onChange () {}
}

export default auth
