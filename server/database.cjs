const mongoose = require('mongoose')

mongoose.set('strictQuery', true)

const buildConnectionOptions = () => {
  const uri =
    process.env.MONGODB_URI ||
    'mongodb+srv://tlmainam03_db_user:qDu1kfhuWxdJ2fk0@cluster0.w0jlxtq.mongodb.net/'
  const dbName = process.env.MONGODB_DB_NAME || 'assignment'
  const options = {
    autoIndex: true,
    dbName,
  }

  return { uri, options }
}

const connectDatabase = async () => {
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    return mongoose.connection
  }

  const { uri, options } = buildConnectionOptions()
  await mongoose.connect(uri, options)
  return mongoose.connection
}

const disconnectDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
  }
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
  mongoose,
}
