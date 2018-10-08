import React, { Component } from 'react'
import { Button, Header, Modal, Icon } from 'semantic-ui-react'

class UpdateContact extends Component {
  render () {
    return (
      <Modal
        open={this.props.showModal}
        onClose={this.props.handleClose}
        closeIcon style={{height: 'maxContent', position: 'relative', overflow: 'visible'}}
        size='tiny'>
        <Header content='Contact Card' />
        <Modal.Content>
          <Modal.Description>
            <label>Contact Name:</label><br /> <br />
            <input className='form-control' onChange={() => { this.props.handleUpdate(this.refs.title.value, this.refs.TAG.value, this.refs.URL.value) }}
              placeholder={`Provide new name for: ${this.props.selectedContact.name}`}
              ref='title' /><br />

            <label>Custom TAG:</label><br /> <br />
            <input className='form-control' onChange={() => { this.props.handleUpdate(this.refs.title.value, this.refs.TAG.value, this.refs.URL.value) }}
              placeholder={`Provide TAG for: ${this.props.selectedContact.customID ? this.props.selectedContact.customID : 'N / A'}`}
              ref='TAG' /><br />

            <label>Custom URL:</label><br /> <br />
            <input className='form-control' onChange={() => { this.props.handleUpdate(this.refs.title.value, this.refs.TAG.value, this.refs.URL.value) }}
              placeholder={`Provide URL for: ${this.props.selectedContact.customURL ? this.props.selectedContact.customURL : 'N / A'}`}
              ref='URL' /><br />
          </Modal.Description>
        </Modal.Content>
        <Modal.Actions>
          <Button color='green' circular disabled={this.props.buttonDisabled}
            onClick={() => this.props.onUpdate(this.refs.title.value, this.refs.TAG.value, this.refs.URL.value)}>
            <Icon name='checkmark' /> Update
          </Button>
          <Button color='red' circular
            onClick={() => { this.props.onDelete(this.props.selectedContact.phone) }}>
            <Icon name='delete' /> Delete
          </Button>
        </Modal.Actions>
      </Modal>
    )
  }
}

export default UpdateContact
