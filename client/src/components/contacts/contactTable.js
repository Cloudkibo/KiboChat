import React, { Component } from 'react'
import { Table, Popup, Label } from 'semantic-ui-react'
import Avatar from 'react-avatar'

class ContactTable extends Component {
  render () {
    return (

      <div style={{ padding: '10px' }}>
        <Table striped selectable>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell textAlign='center'>Profile Picture</Table.HeaderCell>
              <Table.HeaderCell>Name</Table.HeaderCell>
              <Table.HeaderCell>Number</Table.HeaderCell>
              <Table.HeaderCell>On Whatsapp</Table.HeaderCell>
              <Table.HeaderCell>Subscription Status</Table.HeaderCell>
              <Table.HeaderCell>Custom TAG</Table.HeaderCell>
              <Table.HeaderCell>Custom Link</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {
              this.props.contactsList
                ? this.props.contactsList.map(contact => (
                  <Popup trigger={
                    <Table.Row style={{cursor: 'pointer'}} key={contact._id}
                      onClick={() => { this.props.onRowClick(contact._id) }}>

                      <Table.Cell textAlign='center'> <Avatar name={contact.name}
                        round style={{margin: 'auto'}} size='45' maxInitials='2' /></Table.Cell>

                      <Table.Cell>{contact.name}</Table.Cell>
                      <Table.Cell>{contact.phone}</Table.Cell>
                      <Table.Cell>{contact.status === 'valid' ? 'Yes' : 'No'}</Table.Cell>
                      <Table.Cell>{contact.isSubscribed ? 'Subscribed' : 'Not Subscribed'}</Table.Cell>
                      <Table.Cell>
                        <Label as='a' basic>
                          {contact.customID ? contact.customID : 'N / A'}
                        </Label>
                      </Table.Cell>
                      <Table.Cell>
                        <Label as='a' basic>
                          {
                            contact.customURL
                              ? <a href={contact.customURL} target='_blank'>
                                {contact.customURL}
                              </a>
                              : 'N / A'
                          }
                        </Label>
                      </Table.Cell>
                    </Table.Row>
                  } content='Click to update contact information' inverted position='top center'
                  />)
                )
                : <div style={{margin: 'auto'}}>There are no contacts. Kindly upload</div>
            }
          </Table.Body>
        </Table>
      </div>

    )
  }
}

export default ContactTable
