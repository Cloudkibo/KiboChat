import React, { Component } from 'react'
class CardWithProgress extends Component {
  render () {
    return (
      <div className='col-xl-6'>
        <div className='m-portlet m-portlet--full-height m-portlet--skin-light m-portlet--fit' style={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
          <div className='m-portlet__body'>
            <div className='m-widget21'>
              <div className='row'>
                <div className='col-xl-4'>
                  <a>
                    <div className='m-widget21__item'>
                      <span className='m-widget21__icon'>
                        <a className='btn btn-brand m-btn m-btn--icon m-btn--icon-only m-btn--custom m-btn--pill'>
                          <i className='fa flaticon-users m--font-light' />
                        </a>
                      </span>
                      <div className='m-widget21__info'>
                        <span className='m-widget21__title'>
                          {this.props.totalGroups}
                        </span>
                        <br />
                        <span className='m-widget21__sub'>
                          Total Groups
                        </span>
                      </div>
                    </div>
                  </a>
                </div>
                <div className='col-xl-4'>
                  <a>
                    <div className='m-widget21__item'>
                      <span className='m-widget21__icon'>
                        <a className='btn btn-accent m-btn m-btn--icon m-btn--icon-only m-btn--custom m-btn--pill'>
                          <i className='fa flaticon-user-ok m--font-light' />
                        </a>
                      </span>
                      <div className='m-widget21__info'>
                        <span className='m-widget21__title'>
                          {this.props.joinedGroups}
                        </span>
                        <br />
                        <span className='m-widget21__sub'>
                          Joined Groups
                        </span>
                      </div>
                    </div>
                  </a>
                </div>
                <div className='col-xl-4'>
                  <a>
                    <div className='m-widget21__item'>
                      <span className='m-widget21__icon'>
                        <a className='btn btn-warning m-btn m-btn--icon m-btn--icon-only m-btn--custom m-btn--pill'>
                          <i className='la la-user-times m--font-light' />
                        </a>
                      </span>
                      <div className='m-widget21__info'>
                        <span className='m-widget21__title'>
                          {this.props.joinedGroups}
                        </span>
                        <br />
                        <span className='m-widget21__sub'>
                          Left Groups
                        </span>
                      </div>
                    </div>
                  </a>
                </div>
              </div>
              <div className='m--space-30' />
              <div className='m-widget15'>
                <div className='m-widget15__item'>
                  <span style={{fontSize: '1.1rem', fontWeight: '600', color: '#6f727d'}}>
                    {'50.0%'}
                  </span>
                  <span style={{fontSize: '0.85rem', float: 'right', marginTop: '0.3rem', color: '#9699a2'}}>
                    Some KPI
                  </span>
                  <div className='m--space-10' />
                  <div className='progress m-progress--sm' style={{height: '6px'}}>
                    <div className='progress-bar bg-success' role='progressbar' style={{width: '50%'}} aria-valuenow={(2 / 10) * 100} aria-valuemin='0' aria-valuemax='100' />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default CardWithProgress
