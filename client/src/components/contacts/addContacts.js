import React, { Component } from 'react'
import { Button, Header, Modal, Icon } from 'semantic-ui-react'
import Dropzone from 'react-dropzone'

class AddContacts extends Component {
  render () {
    return (
      <Modal
        open={this.props.showModal}
        onClose={this.props.handleClose}
        closeIcon style={{height: 'maxContent', position: 'relative', overflow: 'visible'}}
        size='mini'>
        <Header content='Upload Contacts.csv' />
        <div style={{ textAlign: 'center', margin: '20px' }}>
          <Modal.Content>
            <Modal.Description>
              <Dropzone accept='text/csv, application/vnd.ms-excel'
                style={{height: 'auto', width: 'auto'}} onDrop={(files) => this.props.onDrop(files)}>

                <Button circular icon='upload' size='big' />
                <p style={{ margin: '20px' }}>Click to upload</p>
              </Dropzone>
            </Modal.Description>
          </Modal.Content>
        </div>
        <Modal.Actions>
          { this.props.buttonDisabled
            ? <Button color='green' circular disabled onClick={() => this.props.onCreate()}>
              <Icon name='checkmark' /> Upload
            </Button>
            : <Button color='green' circular onClick={() => this.props.onCreate()}>
              <Icon name='checkmark' /> Upload
            </Button>
          }
        </Modal.Actions>
      </Modal>
    )
  }
}

export default AddContacts
