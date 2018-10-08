/**
 * Created by imran on 28/08/2018.
 */

import React, {Component} from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { Link } from 'react-router-dom'
import Notifier from 'react-desktop-notification'

class Sidebar extends Component {
  constructor (props, context) {
    super(props, context)
    this.state = {}
  }

  componentWillReceiveProps (nextProps) {
    if (nextProps.chats) {
      Notifier.focus('KiboWhatsapp', 'You got a new message', 'http://locahost:3000/chat', '')
    }
  }

  // componentDidMount () {
  //   Notifier.focus('KiboWhatsapp', 'You got a new message', '/chat', '')
  // }

  showOperationalDashboard () {
    return (
      <li className='m-menu__item  m-menu__item--submenu' aria-haspopup='true' data-menu-submenu-toggle='hover'>
        <a href='' className='m-menu__link m-menu__toggle'>
          <i className='m-menu__link-icon flaticon-squares-4' title='operationalDashboard' />
          <span className='m-menu__link-text'>Operational Dashboard</span>
        </a>
      </li>
    )
  }

  showDashboard () {
    return (
      <li className='m-menu__item  m-menu__item--submenu' aria-haspopup='true' data-menu-submenu-toggle='hover'>
        <Link to='/' className='m-menu__link m-menu__toggle'>
          <i className='m-menu__link-icon flaticon-squares-4' title='Dashboard' />
          <span className='m-menu__link-text'>Dashboard</span>
        </Link>
      </li>
    )
  }

  showContacts () {
    return (
      <li className='m-menu__item  m-menu__item--submenu' aria-haspopup='true' data-menu-submenu-toggle='hover'>
        <Link to='/contacts' className='m-menu__link m-menu__toggle'>
          <i className='m-menu__link-icon flaticon-squares-4' title='Contacts' />
          <span className='m-menu__link-text'>Contacts</span>
        </Link>
      </li>
    )
  }

  showGroups () {
    return (
      <li className='m-menu__item  m-menu__item--submenu' aria-haspopup='true' data-menu-submenu-toggle='hover'>
        <Link to='/groups' className='m-menu__link m-menu__toggle'>
          <i className='m-menu__link-icon flaticon-squares-4' title='Groups' />
          <span className='m-menu__link-text'>Groups</span>
        </Link>
      </li>
    )
  }

  showMedia () {
    return (
      <li className='m-menu__item  m-menu__item--submenu' aria-haspopup='true' data-menu-submenu-toggle='hover'>
        <a href='' className='m-menu__link m-menu__toggle'>
          <i className='m-menu__link-icon flaticon-squares-4' title='Media' />
          <span className='m-menu__link-text'>Media</span>
        </a>
      </li>
    )
  }

  showMessages () {
    return (
      <li className='m-menu__item  m-menu__item--submenu' aria-haspopup='true' data-menu-submenu-toggle='hover'>
        <Link to='/chat'className='m-menu__link m-menu__toggle'>
          <i className='m-menu__link-icon flaticon-squares-4' title='Messages' />
          <span className='m-menu__link-text'>Messages</span>
        </Link>
      </li>
    )
  }

  render () {
    return (
      <div id='sidebarDiv'>
        <button className='m-aside-left-close  m-aside-left-close--skin-dark ' id='m_aside_left_close_btn'>
          <i className='la la-close' />
        </button>
        <div id='m_aside_left' className='m-grid__item m-aside-left  m-aside-left--skin-dark' style={{height: 100 + '%'}}>
          <div
            id='m_ver_menu'
            className='m-aside-menu  m-aside-menu--skin-dark m-aside-menu--submenu-skin-dark m-scroller mCustomScrollbar _mCS_2 mCS-autoHide'
            data-menu-vertical='1'
            data-menu-scrollable='1'>
            <div id='mCSB_2' className='mCustomScrollBox mCS-minimal-dark mCSB_vertical mCSB_outside' tabIndex='0' style={{maxHeight: 'none'}}>
              <div id='mCSB_2_container' className='mCSB_container' style={{position: 'relative', top: '0px', left: '0px'}} dir='ltr'>
                <ul style={{height: '87vh', overflow: 'auto'}} className='m-menu__nav  m-menu__nav--dropdown-submenu-arrow '>
                  {this.showDashboard()}
                  {this.showContacts()}
                  {this.showGroups()}
                  {this.showMessages()}
                  <li className='m-menu__item  m-menu__item--submenu' aria-haspopup='true' data-menu-submenu-toggle='hover'>
                    <Link to='settings' className='m-menu__link m-menu__toggle'>
                      <i className='m-menu__link-icon flaticon-cogwheel' title='Settings' />
                      <span className='m-menu__link-text'>Settings</span>
                    </Link>
                  </li>
                  <li className='m-menu__item  m-menu__item--submenu' aria-haspopup='true' data-menu-submenu-toggle='hover'>
                    <a href='http://kibopush.com/user-guide/' target='_blank' className='m-menu__link m-menu__toggle'>
                      <i className='m-menu__link-icon flaticon-info' title='User Guide' />
                      <span className='m-menu__link-text'>User Guide</span>
                    </a>
                  </li>
                </ul>
              </div>
            </div>
            <div id='mCSB_2_scrollbar_vertical' className='mCSB_scrollTools mCSB_2_scrollbar mCS-minimal-dark mCSB_scrollTools_vertical' style={{display: 'block'}}>
              <div className='mCSB_draggerContainer'>
                <div id='mCSB_2_dragger_vertical' className='mCSB_dragger' style={{position: 'absolute', minHeight: '50px', display: 'block', maxHeight: '303px', top: '0px'}}>
                  <div className='mCSB_dragger_bar' style={{lineHeight: '50px'}} />
                </div>
                <div className='mCSB_draggerRail' />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
function mapStateToProps (state) {
  return {
    chats: state.chatReducer.chats
  }
}

function mapDispatchToProps (dispatch) {
  return bindActionCreators({}, dispatch)
}
export default connect(mapStateToProps, mapDispatchToProps)(Sidebar)
