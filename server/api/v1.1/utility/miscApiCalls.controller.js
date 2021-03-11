const { callApi } = require('./index')

function getContact (companyId, number, customer) {
  return new Promise((resolve, reject) => {
    let query = {
      companyId: companyId,
      $or: [
        {number: number},
        {number: number.replace(/\D/g, '')}
      ]
    }
    callApi(`whatsAppContacts/query`, 'post', query)
      .then(contacts => {
        if (contacts.length > 0) {
          resolve(contacts[0])
        } else {
          callApi(`whatsAppContacts`, 'post', {
            name: customer.first_name + ' ' + customer.last_name,
            number: number,
            companyId: companyId,
            marketing_optin: customer.accepts_marketing
          }, 'accounts')
            .then(contact => {
              resolve(contact)
            })
            .catch((err) => {
              reject(err)
            })
        }
      })
      .catch((err) => {
        reject(err)
      })
  })
}

function getContactById (companyId, contactId) {
  return new Promise((resolve, reject) => {
    let query = {
      companyId: companyId,
      _id: contactId
    }
    callApi(`whatsAppContacts/query`, 'post', query)
      .then(contacts => {
        if (contacts.length > 0) {
          resolve(contacts[0])
        }
      })
      .catch((err) => {
        reject(err)
      })
  })
}

exports.getContact = getContact
exports.getContactById = getContactById
