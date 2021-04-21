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
          let name = getContactName(customer.first_name, customer.last_name, number)
          callApi(`whatsAppContacts`, 'post', {
            name: name,
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

function getContactName (firstName, lastName, number) {
  let name = ''
  if (firstName && lastName) {
    name = firstName + ' ' + lastName
  } else if (firstName) {
    name = firstName
  } else {
    name = number
  }
  return name
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

exports.incrementCompanyUsageMessage = (companyId, platform, increment) => {
  return callApi(`featureUsage/updateCompany`, 'put', {
    query: {companyId: companyId, platform: platform},
    newPayload: { $inc: { messages: increment } },
    options: {}
  })
}

exports.fetchUsages = (companyId, planId, platform, data) => {
  return new Promise((resolve, reject) => {
    callApi(`featureUsage/companyQuery`, 'post', {companyId: companyId, platform: platform})
      .then(companyUsage => {
        companyUsage = companyUsage[0]
        callApi(`featureUsage/planQuery`, 'post', {planId: planId})
          .then(planUsage => {
            planUsage = planUsage[0]
            if (!planUsage) {
              if (data) {
                planUsage = {messages: data.messages}
                resolve({planUsage, companyUsage})
              } else {
                callApi(`companyprofile/query`, 'post', {_id: companyId})
                  .then(company => {
                    planUsage = {messages: company.sms.messages}
                    resolve({planUsage, companyUsage})
                  })
                  .catch(err => {
                    reject(err)
                  })
              }
            } else {
              resolve({planUsage, companyUsage})
            }
          })
          .catch(err => {
            reject(err)
          })
      })
      .catch(err => {
        reject(err)
      })
  })
}

exports.getContact = getContact
exports.getContactById = getContactById
