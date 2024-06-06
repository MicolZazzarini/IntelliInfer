import { IDao } from './daoInterface';
import User from '../models/user';
import { ConcreteErrorCreator } from '../factory/ErrorCreator';
import {ErrorCode} from "../factory/ErrorCode";

export default class UserDAO implements IDao<User> {

    constructor() {}
    
    // it creates a new User or throw an error if the creation operation failed
    async create(userJson: any): Promise<User> {
        try{
            const data = await User.create(userJson);
            return data;
        } catch{
            throw new ConcreteErrorCreator().createServerError().setFailedCreationItem();
        }
    }
    
    // to delete if not used
    async findById(id: number): Promise<User | null> {
        const user = await User.findByPk(id);
        if(!user){
            throw new ConcreteErrorCreator().createNotFoundError().setAbstentModel();
        }
        return user;
    }

    async findByEmail(email: string): Promise<User | ConcreteErrorCreator> {
         try {
            let user: User | null = await User.findOne({ where: { email } });
            if (user === null) {
                throw new ConcreteErrorCreator().createNotFoundError().setNoUser();
            } else {
                return user;
            }
         } catch (error) {
             throw new ConcreteErrorCreator().createNotFoundError().setNoUser();
         }
    }
    
    // I suppose the admin could create and delete users (??)
    async delete(id: number): Promise<boolean> {
        const user = await User.findByPk(id);
        if (user) {
            await user.destroy();
            return true;
        }
        return false;
    }
}

