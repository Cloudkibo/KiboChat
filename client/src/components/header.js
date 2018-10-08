/**
 * Created by imran on 28/08/2018.
 */

import React, { Component } from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import auth from './../utility/auth.service'

class Header extends Component {
  constructor (props, context) {
    super(props, context)
    this.state = {}
    this.toggleSidebar = this.toggleSidebar.bind(this)
  }

  toggleSidebar () {
    /* eslint-disable */
    $('body').toggleClass(' m-aside-left--minimize m-brand--minimize')
    /* eslint-enable */
  }

  componentDidMount () {}
  componentWillReceiveProps (nextProps) {}
  componentWillMount () {}

  render () {
    return (
      <header id='headerDiv' className='m-grid__item m-header' data-minimize-offset='200' data-minimize-mobile-offset='200' >
        <div className='m-container m-container--fluid m-container--full-height'>
          <div className='m-stack m-stack--ver m-stack--desktop'>
            <div className='m-stack__item m-brand  m-brand--skin-dark '>
              <div className='m-stack m-stack--ver m-stack--general'>
                <div className='m-stack__item m-stack__item--middle m-brand__logo'>
                  <h4 className='m-brand__logo-wrapper' style={{color: 'white'}}>
                    KIBOWHATSAPP
                  </h4>
                </div>
                <div className='m-stack__item m-stack__item--middle m-brand__tools'>
                  <a href='javascript:;' onClick={this.toggleSidebar} id='m_aside_left_minimize_toggle' className='m-brand__icon m-brand__toggler m-brand__toggler--left m--visible-desktop-inline-block'>
                    <span />
                  </a>
                  <a href='javascript:;' id='m_aside_left_offcanvas_toggle' className='m-brand__icon m-brand__toggler m-brand__toggler--left m--visible-tablet-and-mobile-inline-block'>
                    <span />
                  </a>
                </div>
              </div>
            </div>
            <div className='m-stack__item m-stack__item--fluid m-header-head' id='m_header_nav'>
              <button className='m-aside-header-menu-mobile-close  m-aside-header-menu-mobile-close--skin-dark ' id='m_aside_header_menu_mobile_close_btn'>
                <i className='la la-close' />
              </button>
              <div id='m_header_topbar' className='m-topbar  m-stack m-stack--ver m-stack--general'>
                <div className='m-stack__item m-topbar__nav-wrapper'>
                  <ul className='m-topbar__nav m-nav m-nav--inline'>
                    <li className='m-nav__item m-topbar__user-profile m-topbar__user-profile--img  m-dropdown m-dropdown--medium m-dropdown--arrow m-dropdown--header-bg-fill m-dropdown--align-right m-dropdown--mobile-full-width m-dropdown--skin-light' data-dropdown-toggle='click'>
                      <a href='#' className='m-nav__link m-dropdown__toggle'>
                        <span className='m-topbar__userpic'>
                          {/* <div style={{display: 'inline-block', marginRight: '5px'}}>
                            <img src={'icons/users.jpg'} className='m--img-rounded m--marginless m--img-centered' alt='' />
                          </div>
                          */}
                          <div style={{display: 'inline-block', height: '41px'}}>
                            <span className='m-nav__link-text' style={{lineHeight: '41px', verticalAlign: 'middle', textAlign: 'center'}}>{this.props.user ? this.props.user.companyName : 'Username'} <i className='fa fa-chevron-down' />
                            </span>
                          </div>
                        </span>
                        <span className='m-topbar__username m--hide'>
                          {this.props.user ? this.props.user.companyName : 'Username'}
                        </span>
                      </a>
                      <div className='m-dropdown__wrapper'>
                        <span className='m-dropdown__arrow m-dropdown__arrow--right m-dropdown__arrow--adjust' />
                        <div className='m-dropdown__inner'>
                          <div className='m-dropdown__header m--align-center'>
                            <div className='m-card-user m-card-user--skin-dark'>
                              <div className='m-card-user__pic'>
                                <img src={'icons/users.jpg'} className='m--img-rounded m--marginless' alt='' />
                              </div>
                              <div className='m-card-user__details'>
                                <span className='m-card-user__name m--font-weight-500'>
                                  {this.props.user ? this.props.user.companyName : 'Username'}
                                </span>
                                <span className='m-card-user__email'>
                                  {this.props.user && this.props.user.email ? this.props.user.email : 'Username@cloudkibo.com'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className='m-dropdown__body'>
                            <div className='m-dropdown__content'>
                              <ul className='m-nav m-nav--skin-light'>
                                <li className='m-nav__section m--hide'>
                                  <span className='m-nav__section-text'>My Groups</span>
                                </li>
                                <li className='m-nav__item'>
                                  <a href='' className='m-nav__link'>
                                    <i className='m-nav__link-icon flaticon-chat-1' />
                                    <span className='m-nav__link-text'>Messages</span>
                                  </a>
                                </li>
                                <li className='m-nav__separator m-nav__separator--fit' />
                                <li className='m-nav__item'>
                                  <a href='http://kibopush.com/faq/' target='_blank' className='m-nav__link'>
                                    <i className='m-nav__link-icon flaticon-info' />
                                    <span className='m-nav__link-text'>FAQs</span>
                                  </a>
                                </li>
                                <li className='m-nav__item'>
                                  <a href=''>
                                    <i className='m-nav__link-icon flaticon-settings' />
                                    <span className='m-nav__link-text'>&nbsp;&nbsp;&nbsp;Settings</span>
                                  </a>
                                </li>
                                <li className='m-nav__separator m-nav__separator--fit' />
                                <li className='m-nav__item'>
                                  <a onClick={() => { auth.logout() }} href='/' className='btn m-btn--pill btn-secondary m-btn m-btn--custom m-btn--label-brand m-btn--bolder'>
                                    Logout
                                  </a>
                                </li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                    <li className=' btn btn-sm m-btn m-btn--pill m-btn--gradient-from-focus m-btn--gradient-to-danger'>
                      <a href='http://kibopush.com/user-guide/' target='_blank' style={{color: 'white', textDecoration: 'none'}}> Documentation </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
    )
  }
}

function mapStateToProps (state) {
  return {
    user: state.userReducer.user
  }
}

function mapDispatchToProps (dispatch) {
  return bindActionCreators({}, dispatch)
}
export default connect(mapStateToProps, mapDispatchToProps)(Header)
