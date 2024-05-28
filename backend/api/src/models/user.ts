import { DataTypes, Model } from 'sequelize';
import { SequelizeConnection } from '../db/SequelizeConnection';

export default class User extends Model {

  declare id: number;
  
  declare username: string;
  
  declare email: string;

  declare token: number;

  declare readonly createdAt: Date;

  declare readonly updatedAt: Date;

}

const sequelize = SequelizeConnection.getInstance().sequelize;

/**
 * Initialize model, define sequelize connection, the name of the table, 
 * its attributes and relations
 */
User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    token: {
      type: DataTypes.DECIMAL,
      allowNull: false
    }
  },
  {
    sequelize,
    modelName: "User",
    tableName: "users",
    timestamps: true,
    underscored: true
  },
);

// todo handle error
User.sync().then(() => {
  console.log('users table has been synchronized.');
}).catch(err => {
  console.error('Unable to synchronize users table:', err);
});
