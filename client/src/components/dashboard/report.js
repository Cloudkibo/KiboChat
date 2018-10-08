import React, { Component } from 'react'
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line, LineChart } from 'recharts'
class Report extends Component {
  render () {
    let data = [
      {date: '01-01-2018', sessions: 5, contacts: 2, groups: 5, value: 15},
      {date: '02-01-2018', sessions: 0, contacts: 3, groups: 0, value: 15},
      {date: '03-01-2018', sessions: 2, contacts: 4, groups: 2, value: 15},
      {date: '04-01-2018', sessions: 10, contacts: 0, groups: 10, value: 15},
      {date: '05-01-2018', sessions: 1, contacts: 5, groups: 15, value: 15}
    ]
    return (
      <div className='col-xl-12 col-lg-12 col-md-12 col-xs-12 col-sm-12'>
        <div className='m-portlet m-portlet--full-height '>
          <div className='m-portlet__head'>
            <div className='m-portlet__head-caption'>
              <div className='m-portlet__head-title'>
                <h3 className='m-portlet__head-text'>Reports</h3>
              </div>
            </div>
          </div>
          <div className='m-portlet__body'>
            <div className='tab-content'>
              <center>
                <LineChart width={600} height={300} data={data}>
                  <XAxis dataKey='date' />
                  <YAxis />
                  <CartesianGrid strokeDasharray='3 3' />
                  <Tooltip />
                  <Legend />
                  <Line type='monotone' dataKey='groups' name='Groups' stroke='#8884d8' activeDot={{r: 8}} />
                  <Line type='monotone' dataKey='sessions' name='Sessions' stroke='#82ca9d' activeDot={{r: 8}} />
                  <Line type='monotone' dataKey='contacts' name='Contacts' stroke='#FF7F50' activeDot={{r: 8}} />
                </LineChart>
              </center>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default Report
