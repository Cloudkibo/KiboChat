import React, { Component } from 'react'
import Progress from 'react-progressbar'

class Signup extends Component {
  render () {
    return (
      <div style={{height: '100%'}}>
        <div className='m-grid__item m-grid__item--fluid m-grid m-grid--ver-desktop m-grid--desktop m-grid--tablet-and-mobile m-grid--hor-tablet-and-mobile m-login m-login--1 m-login--singin m-login--signup' id='m_login' style={{height: 100 + 'vh'}}>
          <div className='m-grid__item m-grid__item--order-tablet-and-mobile-2 m-login__aside'>
            <div style={{marginTop: -60}} className='m-stack m-stack--hor m-stack--desktop'>
              <div className='m-stack__item m-stack__item--fluid'>
                <div className='m-login__wrapper'>
                  <div className='m-login__signup'>
                    <div className='m-login__head'>
                      <h3 className='m-login__title'>
                        {this.props.type}
                      </h3>
                      {this.props.type === 'Sign Up' &&
                      <div className='m-login__desc'>
                        Enter your details to create your account:
                      </div>
                      }
                    </div>
                    <form onSubmit={(e) => this.props.onSubmit(e, this.refs.password ? this.refs.password.value : null, this.refs.rpassword ? this.refs.rpassword.value : null, this.refs.companyName ? this.refs.companyName.value : null, this.refs.email ? this.refs.email.value : null, this.refs.phoneNumber ? this.refs.phoneNumber.value : null)} className='m-login__form m-form'>
                      <div className='form-group m-form__group'>
                        <input className='form-control m-input' type='text' placeholder='Company Name' ref='companyName' required style={{ WebkitBoxShadow: 'none', boxShadow: 'none', height: '45px' }} />
                      </div>
                      <div className='form-group m-form__group'>
                        <input className='form-control m-input' type={this.props.type === 'Sign Up' ? 'email' : 'text'} placeholder={this.props.type === 'Sign Up' ? 'Email Address' : 'Email Address or Phone Number'} ref='email' required style={{ WebkitBoxShadow: 'none', boxShadow: 'none', height: '45px' }} />
                      </div>
                      {this.props.type === 'Sign Up' &&
                      <div className='form-group m-form__group'>
                        <input className='form-control m-input' type='number' placeholder='Phone Number e.g. +44 7911 123456' ref='phoneNumber' required style={{ WebkitBoxShadow: 'none', boxShadow: 'none', height: '45px' }} />
                      </div>
                      }
                      <div className='form-group m-form__group'>
                        <input className='form-control m-input' type='password' placeholder='Password' ref='password' required style={{ WebkitBoxShadow: 'none', boxShadow: 'none', height: '45px' }}
                          onChange={this.props.handlePwdChange} />
                        { this.props.password && this.props.pwdlength === false && this.props.type === 'Sign Up' &&
                          <div id='email-error' style={{color: 'red'}}>Length of password should be greater than 6</div>
                        }
                        { this.props.password && this.props.type === 'Sign Up' &&
                          <div>
                            <div> Strength: {this.props.strength}</div>
                            <div> <Progress completed={this.props.pwdBar} color={this.props.pwd_color} /> </div>
                          </div>
                        }
                      </div>
                      {this.props.type === 'Sign Up' &&
                      <div className='form-group m-form__group'>
                        <input className='form-control m-input' type='password' required placeholder='Confirm Password' ref='rpassword' style={{ WebkitBoxShadow: 'none', boxShadow: 'none', height: '45px' }}
                          onChange={(e) => this.props.equal(e, this.refs.password.value)} />
                        { this.props.password && this.props.ismatch === false &&
                          <div id='email-error' style={{color: 'red'}}>Passwords do not match</div>
                        }
                      </div>
                      }
                      <div className='m-login__form-action'>
                        <button type='submit' id='m_login_signup_submit' className='btn btn-focus m-btn m-btn--pill m-btn--custom m-btn--air'>
                          {this.props.type}
                        </button>
                        <button id='m_login_signup_cancel' onClick={this.onCancel} className='btn btn-outline-focus  m-btn m-btn--pill m-btn--custom'>
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
              {this.props.type === 'Sign In' &&
              <div className='m-stack__item m-stack__item--center'>
                <span className='m-login__account-msg'>Don't have an account yet?</span>&nbsp;&nbsp;
                <a href='/signup' id='m_login_signup' className='m-link m-link--focus m-login__account-link'>Sign Up</a>
              </div>
              }
            </div>
          </div>
          <div className='m-grid__item m-grid__item--fluid m-grid m-grid--center m-grid--hor m-grid__item--order-tablet-and-mobile-1 m-login__content' style={{backgroundImage: "url('assets/app/media/img//bg/bg-4.jpg')"}}>
            <div className='m-grid__item m-grid__item--middle'>
              <h3 className='m-login__welcome'>Join KiboWhatsApp</h3>
              <p className='m-login__msg' />
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default Signup
