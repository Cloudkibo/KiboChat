import React, { Component } from 'react'
class HelpAlert extends Component {
  render () {
    return (

      <div className='m-alert m-alert--icon m-alert--air m-alert--square alert alert-dismissible m--margin-bottom-30' role='alert'>
        <div className='m-alert__icon'>
          <i className='flaticon-technology m--font-accent' />
        </div>
        <div className='m-alert__text'>
          {(this.props.message) ? this.props.message : ''}
        </div>
      </div>

    )
  }
}

export default HelpAlert
