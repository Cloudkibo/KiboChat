// const { callApi } = require('../v1.1/utility')
const { padWithZeros, dateDiffInDays } = require('./../../components/utility')
const logger = require('../../components/logger')
const TAG = 'api/global/messageStatistics.js'
let redis = require('redis')
let client

exports.connectRedis = function () {
  client = redis.createClient()
  client.on('connect', () => {
    logger.serverLog(TAG, 'connected to redis', 'info')
  })
  client.on('error', (err) => {
    logger.serverLog(TAG, 'unable connected to redis ' + JSON.stringify(err), 'info')
  })
}

function recordRedis (featureName) {
  findRedisObject(featureName, (err, record) => {
    if (err) {
      return logger.serverLog(TAG, `error in message statistics ${JSON.stringify(err)}`)
    }
    if (!record) {
      createRedisObject(featureName)
    } else {
      incrementRedisObject(featureName)
    }
  })
}

function createRedisObject (featureName) {
  let today = new Date()
  let minutes = today.getMinutes()
  let hours = today.getHours()
  let day = today.getDate()
  let month = (today.getMonth() + 1)
  let year = today.getFullYear()
  let key = featureName + '-' + year + ':' + month + ':' + day + ':' + hours + ':' + minutes
  client.set(key, 1)
}

function incrementRedisObject (featureName) {
  let today = new Date()
  let minutes = today.getMinutes()
  let hours = today.getHours()
  let day = today.getDate()
  let month = (today.getMonth() + 1)
  let year = today.getFullYear()
  let key = featureName + '-' + year + ':' + month + ':' + day + ':' + hours + ':' + minutes
  client.incr(key)
}

function findRedisObject (featureName, cb) {
  let today = new Date()
  let minutes = today.getMinutes()
  let hours = today.getHours()
  let day = today.getDate()
  let month = (today.getMonth() + 1)
  let year = today.getFullYear()
  let key = featureName + '-' + year + ':' + month + ':' + day + ':' + hours + ':' + minutes
  client.get(key, (err, obj) => {
    if (err) {
      return cb(err)
    }
    cb(null, obj)
  })
}

function findAllKeys (fn) {
  client.keys('*', (err, objs) => {
    if (err) {
      return fn(`error in message statistics find all keys ${JSON.stringify(err)}`)
    }
    if (objs && objs.length > 0) {
      let arrObjs = []
      let arrObjsDel = []
      for (let i = 0; i < objs.length; i++) {
        arrObjs.push(['get', objs[i]])
        if (shouldDelete(objs[i])) arrObjsDel.push(['del', objs[i]])
      }
      client.multi(arrObjs).exec(function (err, replies) {
        if (err) {
          return fn(`error in message statistics multi all keys ${JSON.stringify(err)}`)
        }
        deleteAllKeys(arrObjsDel)
        fn(null, { objs, replies })
      })
    } else {
      fn(null, [])
    }
  })
}

function deleteAllKeys (arrObjs) {
  client.multi(arrObjs).exec(function (err, replies) {
    if (err) {
      return logger.serverLog(TAG, `error in message statistics delete all keys ${JSON.stringify(err)}`)
    }
  })
}

function shouldDelete (key) {
  let dateTime = key.split('-')[1].split(':')
  let MM = padWithZeros(dateTime[1], 2)
  let dd = padWithZeros(dateTime[2], 2)
  let yyyy = dateTime[0]
  let HH = padWithZeros(dateTime[3], 2)
  let mm = padWithZeros(dateTime[4], 2)
  let ss = '00'
  let formattedDateTime = `${MM}/${dd}/${yyyy} ${HH}:${mm}:${ss}`
  let d1 = new Date(formattedDateTime)
  let d2 = new Date()
  let diffInDays = dateDiffInDays(d1, d2)
  if (diffInDays > 60) {
    return true
  }
  return false
}

exports.getRecords = function (featureName, fn) {
  findAllKeys((err, data) => {
    if (err) {
      return fn(err)
    }
    let result = []
    for (let i = 0; i < data.objs.length; i++) {
      let feature = data.objs[i].split('-')[0]
      if (feature === featureName) {
        let dateTime = data.objs[i].split('-')[1].split(':')
        let MM = padWithZeros(dateTime[1], 2)
        let dd = padWithZeros(dateTime[2], 2)
        let yyyy = dateTime[0]
        let HH = padWithZeros(dateTime[3], 2)
        let mm = padWithZeros(dateTime[4], 2)
        let ss = '00'
        let formattedDateTime = `${MM}-${dd}-${yyyy} ${HH}:${mm}:${ss}`
        result.push({
          feature,
          year: yyyy,
          month: MM,
          days: dd,
          hours: HH,
          minutes: mm,
          datetime: formattedDateTime,
          count: data.replies[i]
        })
      }
    }
    fn(null, result)
  })
}

// todo will remove this part
exports.record = function (featureName) {
  recordRedis(featureName)
  //   findRecord(featureName, (err, record) => {
  //     if (err) {
  //       return logger.serverLog(TAG, `error in message statistics ${JSON.stringify(err)}`)
  //     }
  //     if (!record) {
  //       createNewRecord(featureName)
  //     } else {
  //       incrementRecord(featureName)
  //     }
  //   })
}

// function createNewRecord (featureName) {
//   let today = new Date()
//   let payload = { featureName }
//   payload.day = today.getDate()
//   payload.month = (today.getMonth() + 1)
//   payload.year = today.getFullYear()
//   payload.messageCount = 1
//   callApi('messageStatistics', 'post', payload, 'kiboengage', '')
//     .then(saved => {
//       logger.serverLog(TAG, 'Message Statistics created successfully!')
//     })
//     .catch(err => console.log(TAG, `error in message statistics create ${JSON.stringify(err)}`))
// }

// function incrementRecord (featureName) {
//   let today = new Date()
//   let payload = { featureName }
//   payload.day = today.getDate()
//   payload.month = (today.getMonth() + 1)
//   payload.year = today.getFullYear()
//   let query = {
//     purpose: 'updateOne',
//     match: payload,
//     updated: { $inc: { messageCount: 1 } }
//   }
//   callApi(`messageStatistics`, 'put', query, 'kiboengage')
//     .then(updated => {
//       logger.serverLog(TAG, 'Message Statistics updated successfully!')
//     })
//     .catch(err => logger.serverLog(TAG, `error in message statistics create ${JSON.stringify(err)}`))
// }

// function findRecord (featureName, cb) {
//   let today = new Date()
//   let payload = { featureName }
//   payload.day = today.getDate()
//   payload.month = (today.getMonth() + 1)
//   payload.year = today.getFullYear()
//   let query = {
//     purpose: 'findOne',
//     match: payload
//   }
//   callApi(`messageStatistics/query`, 'post', query, 'kiboengage')
//     .then(found => {
//       cb(null, found)
//       logger.serverLog(TAG, 'Message Statistics fetched successfully!')
//     })
//     .catch(err => cb(err))
// }
