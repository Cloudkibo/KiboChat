import React, { Component } from 'react'
// import fetch from 'isomorphic-fetch'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { filter } from 'lodash'
import { withAlert } from 'react-alert'
// import * as ContactActions from '../../redux/actions/contacts.actions'
import { log } from './../../utility/socketio'
import PageTile from './../../components/pageTitle'
import HelpAlert from './../../components/themeComponents/helpAlert'
import PortletHead from './../../components/themeComponents/portletHead'
import ContactTable from './../../components/contacts/contactTable'
import ContactSearch from '../contacts/contactSearch'
import AddContacts from './../../components/contacts/addContacts'
// import * as UserActions from '../../redux/actions/user.actions'
import UpdateContact from './../../components/contacts/updateContact'

class Contacts extends Component {
  constructor (props) {
    super(props)
    this.state = {
      showModal: false,
      showUpdate: false,
      selectedFiles: '',
      selectedContact: [],
      buttonDisabled: true
    }
  }

  componentWillMount () {
    log('Hello From Contacts', {data: 'data'})

    this.props.loadContactsList()
  }

  handleClose = () => {
    this.setState({ showModal: false, showUpdate: false })
  }
  onUpload = () => {
    if (this.state.selectedFiles[0]) {
      // eslint-disable-next-line no-undef
      let data = new FormData()
      data.append('file', this.state.selectedFiles[0])
      data.append('name', 'file')
      this.props.uploadFile(data, this.props.alert)
    } else {
      this.props.alert.show('Only CSV files supported.', {type: 'info'})
    }
    this.setState({ buttonDisabled: true })
    this.handleClose()
  }

  onDrop = (acceptedFile, rejectedFile) => {
    this.setState({selectedFiles: acceptedFile, buttonDisabled: false})
  }

  onRowClick = (id) => {
    let selectedContact = filter(this.props.contactsList, {_id: id})[0]
    this.showUpdate(selectedContact)
  }

  showUpdate = (contact) => {
    this.setState({showUpdate: true, selectedContact: contact})
  }

  onUpdate = (updatedName, TAG, URL) => {
    let payload = {}

    // The names of payload fields should not be changed.

    if (updatedName !== '') { payload.name = updatedName }
    if (TAG !== '') { payload.customID = TAG }
    if (URL !== '') { payload.customURL = URL }

    this.props.updateContact(this.state.selectedContact.phone, payload, this.props.alert)
    this.setState({ buttonDisabled: true })
    this.handleClose()
  }

  onDelete = (phone) => {
    this.props.deleteContact(phone, this.props.alert)
    this.handleClose()
  }

  handleUpdate = (name, TAG, URL) => {
    if (name !== '' || TAG !== '' || URL !== '') this.setState({ buttonDisabled: false })
    else this.setState({ buttonDisabled: true })
  }

  applyFilter = (filter) => {
    console.log(filter)
    // Need to do filteration after pagination
  }

  componentDidMount () {
    console.log('User Details In Contact', this.props.user)
    if (!this.props.user) {
      this.props.loadUserDetails()
    }
  }

  render () {
    return (
      <div style={{width: '100%'}}>
        <PageTile title={'Manage Contacts'} />
        <div className='m-content'>
          <HelpAlert message={'Here you can view the list of all the contacts that you have added.'} />
          {this.state.showModal &&
            <AddContacts onCreate={this.onUpload} onDrop={this.onDrop}
              showModal={this.state.showModal} buttonDisabled={this.state.buttonDisabled}
              handleClose={this.handleClose} />
          }
          {
            this.state.showUpdate &&
            <UpdateContact showModal={this.state.showUpdate} onUpdate={this.onUpdate}
              handleClose={this.handleClose} selectedContact={this.state.selectedContact}
              buttonDisabled={this.state.buttonDisabled} handleUpdate={this.handleUpdate}
              onDelete={this.onDelete} />
          }
          <div className='row'>
            <div className='col-xl-12'>
              <div className='m-portlet'>
                <PortletHead title={'Contacts'} buttonTitle={`Upload Contact`}
                  buttonAction={() => { this.setState({showModal: true}) }} />

                <div className='m-portlet__body' />
                <ContactSearch showUpdate={this.showUpdate} applyFilter={this.applyFilter} />
                <ContactTable onRowClick={this.onRowClick} contactsList={this.props.contactsList} />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

function mapStateToProps (state) {
  console.log(state)
  return {
    contactsList: state.contactsReducer.contactsList,
    user: state.userReducer.user
  }
}

function mapDispatchToProps (dispatch) {
  return bindActionCreators({
  }, dispatch)
}

export default connect(mapStateToProps, mapDispatchToProps)(withAlert(Contacts))
