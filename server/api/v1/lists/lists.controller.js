const utility = require('../utility')
const logicLayer = require('./lists.logiclayer')

exports.allLists = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      utility.callApi(`lists/query`, 'post', { companyId: companyUser.companyId })
        .then(lists => {
          return res.status(201).json({status: 'success', payload: lists})
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch lists ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company user ${JSON.stringify(error)}`
      })
    })
}

exports.getAll = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyuser => {
      let criterias = logicLayer.getCriterias(req.body, companyuser)
      utility.callApi(`lists/aggregate`, 'post', criterias.countCriteria) // fetch lists count
        .then(count => {
          utility.callApi(`lists/aggregate`, 'post', criterias.fetchCriteria) // fetch lists
            .then(lists => {
              if (req.body.first_page === 'previous') {
                res.status(200).json({
                  status: 'success',
                  payload: {lists: lists.reverse(), count: count.length > 0 ? count[0].count : 0}
                })
              } else {
                res.status(200).json({
                  status: 'success',
                  payload: {lists: lists, count: count.length > 0 ? count[0].count : 0}
                })
              }
            })
            .catch(error => {
              return res.status(500).json({
                status: 'failed',
                payload: `Failed to fetch lists ${JSON.stringify(error)}`
              })
            })
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch list count ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company user ${JSON.stringify(error)}`
      })
    })
}
exports.createList = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email, populate: 'companyId' })
    .then(companyUser => {
      utility.callApi(`featureUsage/planQuery`, 'post', {planId: companyUser.companyId.planId})
        .then(planUsage => {
          planUsage = planUsage[0]
          utility.callApi(`featureUsage/companyQuery`, 'post', {companyId: companyUser.companyId._id})
            .then(companyUsage => {
              companyUsage = companyUsage[0]
              // add paid plan check later
              // if (planUsage.segmentation_lists !== -1 && companyUsage.segmentation_lists >= planUsage.segmentation_lists) {
              //   return res.status(500).json({
              //     status: 'failed',
              //     description: `Your lists limit has reached. Please upgrade your plan to premium in order to create more lists.`
              //   })
              // }
              utility.callApi(`lists`, 'post', {
                companyId: companyUser.companyId._id,
                userId: req.user._id,
                listName: req.body.listName,
                conditions: req.body.conditions,
                content: req.body.content,
                parentList: req.body.parentListId,
                parentListName: req.body.parentListName
              })
                .then(listCreated => {
                  utility.callApi(`featureUsage/updateCompany`, 'put', {
                    query: {companyId: req.body.companyId},
                    newPayload: { $inc: { segmentation_lists: 1 } },
                    options: {}
                  })
                    .then(updated => {
                    })
                    .catch(error => {
                      return res.status(500).json({
                        status: 'failed',
                        payload: `Failed to update company usage ${JSON.stringify(error)}`
                      })
                    })
                  return res.status(201).json({status: 'success', payload: listCreated})
                })
                .catch(error => {
                  return res.status(500).json({
                    status: 'failed',
                    payload: `Failed to create list ${JSON.stringify(error)}`
                  })
                })
            })
            .catch(error => {
              return res.status(500).json({
                status: 'failed',
                payload: `Failed to fetch company usage ${JSON.stringify(error)}`
              })
            })
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to plan usage ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to company profile ${JSON.stringify(error)}`
      })
    })
}
exports.editList = function (req, res) {
  utility.callApi(`lists/${req.body._id}`, 'put', {
    listName: req.body.listName,
    conditions: req.body.conditions,
    content: req.body.content
  })
    .then(savedList => {
      return res.status(200).json({status: 'success', payload: savedList})
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to edit ${JSON.stringify(error)}`
      })
    })
}
exports.viewList = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      utility.callApi(`lists/${req.params.id}`, 'get', {})
        .then(list => {
          if (list.initialList === true) {
            utility.callApi(`phone/query`, 'post', {
              companyId: companyUser.companyId,
              hasSubscribed: true,
              fileName: { $all: [list.listName] },
              pageId: { $exists: true, $ne: null }
            })
              .then(number => {
                if (number.length > 0) {
                  let criterias = logicLayer.getSubscriberCriteria(number, companyUser)
                  utility.callApi(`subscribers/query`, 'post', criterias)
                    .then(subscribers => {
                      let content = logicLayer.getContent(subscribers)
                      utility.callApi(`lists/${req.params.id}`, 'put', {
                        content: content
                      })
                        .then(savedList => {
                          return res.status(201).json({status: 'success', payload: subscribers})
                        })
                        .catch(error => {
                          return res.status(500).json({
                            status: 'failed',
                            payload: `Failed to fetch list content ${JSON.stringify(error)}`
                          })
                        })
                    })
                    .catch(error => {
                      return res.status(500).json({
                        status: 'failed',
                        payload: `Failed to fetch subscribers ${JSON.stringify(error)}`
                      })
                    })
                } else {
                  return res.status(500).json({
                    status: 'failed',
                    description: 'No subscribers found'
                  })
                }
              })
              .catch(error => {
                return res.status(500).json({
                  status: 'failed',
                  payload: `Failed to fetch numbers ${JSON.stringify(error)}`
                })
              })
          } else {
            utility.callApi(`subscribers/query`, 'post', {
              isSubscribed: true, companyId: companyUser.companyId, _id: {$in: list.content}})
              .then(subscribers => {
                return res.status(201)
                  .json({status: 'success', payload: subscribers})
              })
              .catch(error => {
                return res.status(500).json({
                  status: 'failed',
                  payload: `Failed to fetch subscribers ${JSON.stringify(error)}`
                })
              })
          }
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch list ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company user ${JSON.stringify(error)}`
      })
    })
}
exports.deleteList = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      utility.callApi(`lists/${req.params.id}`, 'delete', {})
        .then(result => {
          utility.callApi(`featureUsage/updateCompany`, 'put', {
            query: {companyId: companyUser.companyId},
            newPayload: { $inc: { segmentation_lists: -1 } },
            options: {}
          })
            .then(updated => {})
            .catch(error => {
              return res.status(500).json({
                status: 'failed',
                payload: `Failed to update company usage ${JSON.stringify(error)}`
              })
            })
          res.status(201).json({status: 'success', payload: result})
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to delete list ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to delete list ${JSON.stringify(error)}`
      })
    })
}
