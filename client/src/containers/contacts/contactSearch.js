import React, { Component } from 'react'
// import fetch from 'isomorphic-fetch'
import { connect } from 'react-redux'
import { filter, debounce, escapeRegExp } from 'lodash'
import { bindActionCreators } from 'redux'
import { Search, Dropdown, Grid } from 'semantic-ui-react'
class ContactSearch extends Component {
  constructor (props) {
    super(props)
    this.state = {
      isLoading: false,
      results: [],
      shownContacts: [],
      value: ''
    }
  }

  componentWillMount () {
    this.resetComponent()
  }

  resetComponent = () => this.setState({ isLoading: false, results: [], value: '' })

  handleResultSelect = (result) => {
    console.log(result)
    this.props.showUpdate(result)
  }

  handleSearchChange = (e, { value }) => {
    this.setState({ isLoading: true, value })

    setTimeout(() => {
      if (this.state.value.length < 1) return this.resetComponent()
      const re = new RegExp(escapeRegExp(this.state.value), 'i')
      const isMatch = result => re.test(result.name)
      let arr = filter(this.props.contacts, isMatch)
      let payload = arr.map(item => ({ ...item, title: item.name, description: item.phone, contactId: item.wa_id }))
      this.setState({ isLoading: false, results: payload, shownContacts: arr })
    }, 300)
  }

  render () {
    return (
      <div>

        <div className='row' style={{marginTop: '5px'}}>
          <div className='col-xl-6'>
            <Grid>
              <Grid.Column width={6}>
                <Search
                  style={{ marginTop: 0 + 'px', padding: 5 + 'px', marginLeft: '25px' }}
                  loading={this.state.isLoading}
                  onResultSelect={(e, { result }) => { this.handleResultSelect(result) }}
                  onSearchChange={debounce(this.handleSearchChange, 500, { leading: true })}
                  results={this.state.results}
                  value={this.state.value}
                  {...this.props}
                />
              </Grid.Column>
            </Grid>
          </div>
          <div className='col-xl-6'>
            <Dropdown style={{marginTop: '5px', marginRight: '25px'}} text='Filter by Availability'
              icon='filter' floating labeled button className='icon'>

              <Dropdown.Menu>
                <Dropdown.Header icon='tags' content='Filter By Availability' />
                <Dropdown.Item onClick={() => { this.props.applyFilter('subscribed') }}>Subscribed</Dropdown.Item>
                <Dropdown.Item onClick={() => { this.props.applyFilter('not-subscribed') }}>Not Subscribed</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>

            <Dropdown style={{marginTop: '5px'}} text='Filter by Subscription ' icon='filter'
              floating labeled button className='icon'>

              <Dropdown.Menu>
                <Dropdown.Header icon='tags' content='Filter By Subscription' />
                <Dropdown.Item onClick={() => { this.props.applyFilter('onwhatsapp') }}>On Whatsapp</Dropdown.Item>
                <Dropdown.Item onClick={() => { this.props.applyFilter('not-onwhatsapp') }}>Not On Whatsapp</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </div>

      </div>

    )
  }
}

function mapStateToProps (state) {
  return {
    contacts: state.contactsReducer.contactsList
  }
}

function mapDispatchToProps (dispatch) {
  return bindActionCreators({
  }, dispatch)
}

export default connect(mapStateToProps, mapDispatchToProps)(ContactSearch)
