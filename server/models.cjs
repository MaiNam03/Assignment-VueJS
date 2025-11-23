const { randomUUID } = require('crypto')
const { mongoose } = require('./database.cjs')

const defaultSchemaOptions = {
  versionKey: false,
}

const transformDocument = (_doc, ret) => {
  if (!ret.id && ret._id) {
    ret.id = ret._id.toString()
  }
  delete ret._id
  return ret
}

const withToJSONTransform = (schema) => {
  schema.set('toJSON', { virtuals: false, transform: transformDocument })
  return schema
}

const Product = mongoose.model(
  'Product',
  withToJSONTransform(
    new mongoose.Schema(
      {
        id: {
          type: String,
          default: () => randomUUID(),
          unique: true,
        },
        name: {
          type: String,
          required: true,
        },
        description: {
          type: String,
          default: '',
        },
        price: {
          type: Number,
          required: true,
        },
        category: {
          type: String,
          default: '',
        },
        status: {
          type: String,
          default: 'available',
        },
        ordersCount: {
          type: Number,
          default: 0,
        },
        revenue: {
          type: Number,
          default: 0,
        },
        image: {
          type: String,
          default: '',
        },
      },
      defaultSchemaOptions,
    ),
  ),
)

const Customer = mongoose.model(
  'Customer',
  withToJSONTransform(
    new mongoose.Schema(
      {
        id: {
          type: String,
          default: () => randomUUID(),
          unique: true,
        },
        name: {
          type: String,
          required: true,
        },
        email: {
          type: String,
          required: true,
        },
        phone: {
          type: String,
          required: true,
        },
        tier: {
          type: String,
          default: 'Standard',
        },
        address: {
          type: String,
          default: '',
        },
        notes: {
          type: String,
          default: '',
        },
        totalOrders: {
          type: Number,
          default: 0,
        },
        totalSpend: {
          type: Number,
          default: 0,
        },
        joinedAt: {
          type: String,
          default: () => new Date().toISOString(),
        },
      },
      defaultSchemaOptions,
    ),
  ),
)

const Order = mongoose.model(
  'Order',
  withToJSONTransform(
    new mongoose.Schema(
      {
        id: {
          type: String,
          default: () => randomUUID(),
          unique: true,
        },
        customer: {
          type: String,
          required: true,
        },
        items: {
          type: String,
          required: true,
        },
        total: {
          type: Number,
          required: true,
        },
        status: {
          type: String,
          default: 'pending',
        },
        createdAt: {
          type: String,
          default: () => new Date().toISOString(),
        },
        address: {
          type: String,
          default: '',
        },
        payment: {
          type: String,
          default: '',
        },
      },
      defaultSchemaOptions,
    ),
  ),
)

const User = mongoose.model(
  'User',
  withToJSONTransform(
    new mongoose.Schema(
      {
        id: {
          type: String,
          default: () => randomUUID(),
          unique: true,
        },
        username: {
          type: String,
          required: true,
          unique: true,
          trim: true,
        },
        password: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        role: {
          type: String,
          enum: ['admin', 'sales'],
          required: true,
        },
      },
      defaultSchemaOptions,
    ),
  ),
)

module.exports = {
  Product,
  Customer,
  Order,
  User,
}
