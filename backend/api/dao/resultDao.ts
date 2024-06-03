import { IDao } from './daoInterface';
import Result from '../models/result';
import { ConcreteErrorCreator } from '../factory/ErrorCreator';

export default class ResultDAO implements IDao<Result> {

    constructor() {}
    
    // potrebbe servire all'utente visualizzare tutti i risultati ottenuti dalle inferenze precedenti??
    async findAll(): Promise<Result[] | null> {
        try {
          const results = await Result.findAll();
          return results;
        } catch {
            throw new ConcreteErrorCreator().createNotFoundError().setAbsentItems();
        }
    }

    async findById(id: number): Promise<Result | null> {
            const result = await Result.findByPk(id);
            if(!result){
                throw new ConcreteErrorCreator().createNotFoundError().setAbsentResults();
            }
            return result;
    }
    
    // se vogliamo introdurre l'opzione di scegliere se rendere un dataset pubblico o privato, e l'utende sceglie di rendere il proprio dataset
    // privato, si suppone che una volta visualizzati i risultati dell'inferenza sul proprio dataset questi siano inutili nel db, quindi è tenuto
    // a cancellarli
    async delete(id: number): Promise<boolean> {
        const result = await Result.findByPk(id);
        if (result) {
            await result.destroy();
            return true;
        }
        else{
            throw new ConcreteErrorCreator().createNotFoundError().setAbsentResults();
        }
    }
    
}