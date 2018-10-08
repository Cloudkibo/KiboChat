import React, { Component } from 'react'
class PageTitle extends Component {
  render () {
    return (

      <div className='m-subheader '>
        <div className='d-flex align-items-center'>
          <div className='mr-auto'>
            <h3 className='m-subheader__title'>{ (this.props.title) ? this.props.title : '' }</h3>
          </div>
        </div>
      </div>

    )
  }
}

export default PageTitle
