import React, { Component } from 'react'
import { Button } from 'semantic-ui-react'
class PortletHead extends Component {
  render () {
    return (
      <div className='m-portlet__head'>
        <div className='m-portlet__head-caption'>
          <div className='m-portlet__head-title'>
            <h3 className='m-portlet__head-text'>
              {(this.props.title) ? this.props.title : ''}
            </h3>
          </div>
        </div>
        <div className='m-portlet__head-tools'>
          <Button primary circular onClick={this.props.buttonAction}>
            {(this.props.buttonTitle) ? this.props.buttonTitle : ''} </Button>
        </div>
      </div>
    )
  }
}

export default PortletHead
