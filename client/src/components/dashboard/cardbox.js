import React, { Component } from 'react'
class CardBox extends Component {
  render () {
    return (
      <div className={`m-portlet m-portlet--half-height m-portlet--border-bottom-${this.props.color}`}>
        <div className='m-portlet__body'>
          <div className='m-widget26'>
            <div className='m-widget26__number'>
              {this.props.number}
              <small>
                {this.props.title}
              </small>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default CardBox
