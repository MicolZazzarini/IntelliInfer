import UserDao from '../dao/userDao';
import TagDao from '../dao/tagDao';
import Tag from '../models/tag';
import DatasetDao from '../dao/datasetDao';
import ImageDao from '../dao/imageDao';
import Image from '../models/image';
import AiDao from '../dao/aiDao';
import Ai from '../models/ai';
import ResultDao from '../dao/resultDao';
import Result from '../models/result';
import { ConcreteErrorCreator } from '../factory/ErrorCreator';
import Dataset from '../models/dataset';
import User from "../models/user";
import DatasetTags from '../models/datasettag';
import path from 'path';
import fs from 'fs';
import { IZipEntry }  from 'adm-zip';
import mime from 'mime-types';
import { v4 as uuidv4 } from 'uuid';
import {generatePath, SuccessResponse} from "../utils/utils";
import DatasetTagDAO from "../dao/datasetTagDao";


export interface IRepository {
    getUserById(userId: number): Promise<User | ConcreteErrorCreator>;
    getUserByEmail(userEmail: string): Promise<User | ConcreteErrorCreator>;
    getDatasetListByUserId(userId: number): Promise<Dataset[] | ConcreteErrorCreator>;
    createTags(tags: string[], datasetId: number): Promise<Tag[]>;
    listAiModels(): Promise<Ai[] | ConcreteErrorCreator>;
    findModel(modelId: number): Promise<Ai | ConcreteErrorCreator>;
    findResult(resultId: number): Promise<Result | ConcreteErrorCreator>;
    listImageFromDataset(datasetId: number): Promise<Image[] | ConcreteErrorCreator>;
    createDatasetWithTags(data: any, user: User): Promise<Dataset> ;
    getDatasetDetail(datasetId: number): Promise<Dataset | ConcreteErrorCreator> ;
    logicallyDelete(datasetId: number): Promise<SuccessResponse | ConcreteErrorCreator>;
    updateModelWeights(modelId: number, weights: string ): Promise<Ai | ConcreteErrorCreator>;
    findDatasetById(datasetId: number): Promise<Dataset | ConcreteErrorCreator>;
    createImage(data: any): Promise<Image | null>;
    createDestinationRepo(datasetId: number): Promise<string | ConcreteErrorCreator> ;
    processZipEntries(datasetId: number, zipEntries: IZipEntry[], destination: string): Promise<void | ConcreteErrorCreator>;
    updateUserTokenByCost(user: User, cost: number): Promise<void>;
    checkUserToken(userId: number, amount: number): Promise<boolean>;
    generateUUID(): Promise<string>;
    getTags(datasetId: number): Promise<string[]>;
    updateCountDataset(datasetId: number, num: number): Promise<Dataset|ConcreteErrorCreator>;
    createListResult(imageList: Image[], aiID: number, UUID: string): Promise<Result[] | ConcreteErrorCreator>;
}


export class Repository implements IRepository {

    constructor() {};

    public async getUserById(userId: number) {
        const user: UserDao = new UserDao();
        return user.findById(userId);
    }

    public async getUserByEmail(userEmail: string): Promise<User | ConcreteErrorCreator> {
        const user: UserDao = new UserDao();
        return user.findByEmail(userEmail);
    }


    public async getDatasetListByUserId(userId: number): Promise<Dataset[] | ConcreteErrorCreator> {
        const dataset: DatasetDao = new DatasetDao();
        return dataset.findAllByUserId(userId);
    }

    // method to create tags associated with a specific dataset
    public async createTags(tags: string[], datasetId: number): Promise<Tag[]> {
        const tagDao = new TagDao()
        const createdTags = await Promise.all(
          tags.map(tagName => tagDao.create({ name: tagName, datasetId }))
        );
        return createdTags;
    }

    // used into the route to create a dataset
    async createDatasetWithTags(data: any, user: User): Promise<Dataset>  {
        const datasetDao: DatasetDao = new DatasetDao();
        const tagDao: TagDao = new TagDao();

        const { name, description, tags } = data; // quando avremo userid ci sarà anche quello

        // Generate the path
        const path: string = generatePath(name);

        // Create the dataset
        const newDataset: Dataset = await datasetDao.create({
          name,
          description,
          path,
          countElements: 0, // Set to 0 or a default value, adjust as needed
          countClasses: tags.length,
          userId: user.id,
        });

        // Associate tags with the dataset
        for (const tagName of tags) {
            const tagInstance: Tag = await tagDao.create({ name: tagName });
            // Crea un'istanza della tabella di associazione DatasetTags
            await DatasetTags.create({
                datasetId: newDataset.id,
                tagId: tagInstance.name
            });
          }

        return newDataset;
    }




    // lists all available Ai models
    async listAiModels(): Promise<Ai[] | ConcreteErrorCreator>{
        const aiDao: AiDao = new AiDao();
        return aiDao.findAll();
    }

    // find an Ai model by id
    async findModel(modelId: number): Promise<Ai | ConcreteErrorCreator>{
        const aiDao: AiDao = new AiDao();
        return aiDao.findById(modelId);
    }

    // find an inference result by id
    async findResult(resultId: number): Promise<Result | ConcreteErrorCreator>{
        const resultDao: ResultDao = new ResultDao();
        return resultDao.findById(resultId);
    }

    // Given the datasetId, deletes logically the dataset
    async logicallyDelete(datasetId: number): Promise<ConcreteErrorCreator| SuccessResponse>{
        try{
            const datasetDao: DatasetDao = new DatasetDao();
            return datasetDao.logicallyDelete(datasetId);
        } catch {
            throw new ConcreteErrorCreator().createServerError().setFailedUpdatingItem();
        }
    };

    // takes an ai model identified by its id and update its property pathWeigths with the path of the new weights
    async updateModelWeights(modelId: number, path: string ): Promise<Ai | ConcreteErrorCreator>  {
        const aiDao: AiDao = new AiDao();
        return aiDao.updateItem(modelId, path);
    }

    async findDatasetById(datasetId: number): Promise<Dataset | ConcreteErrorCreator> {
        const datasetDao = new DatasetDao();
        return datasetDao.findById(datasetId);
    }

    async createImage(data: any): Promise<Image | null> {
        const imageDao = new ImageDao();
        return imageDao.create(data);
    }

    async createDestinationRepo(datasetId: number): Promise<string | ConcreteErrorCreator> {
        const datasetDao = new DatasetDao();
        //const dataset = await Dataset.findByPk(datasetId);
        const dataset = await datasetDao.findById(datasetId);
        if( dataset instanceof Dataset){
            const datasetPath = dataset?.path;
            if(typeof datasetPath === 'string'){
                const destination = path.join('/app/media', datasetPath, 'img');

                // Assicurati che la cartella di destinazione esista
                if (!fs.existsSync(destination)) {
                    fs.mkdirSync(destination, { recursive: true });
                }
                return destination;
            } else {
                throw new ConcreteErrorCreator().createServerError().setFailedCreationRepo();
            }
        } else  throw new ConcreteErrorCreator().createNotFoundError().setAbsentItems();
    }

    async processZipEntries(datasetId: number, zipEntries: IZipEntry[], destination: string): Promise<void | ConcreteErrorCreator> {
        try {
            zipEntries.forEach((entry: IZipEntry) => {
                const entryName = entry.entryName;
                const entryData = entry.getData();
                const mimeType = mime.lookup(entryName);
    
                if (mimeType && mimeType.startsWith('image/')) {
                    const filePath = path.join(destination, entryName);
                    fs.writeFileSync(filePath, entryData);

                    // Salva l'immagine nel database utilizzando ImageDao
                    const imageDao = new ImageDao()
                    imageDao.create({
                    datasetId: datasetId, 
                    path: entryName,
                    description: 'image'
                });
                }
            });
        } catch {
            //return false; // Restituisce false se si verifica un errore durante l'elaborazione
            throw new ConcreteErrorCreator().createServerError().setFailedUploadFile();
        }
    }

    
    // updates the user token amount subtracting a cost
    // checks if the user has the available amount
    public async updateUserTokenByCost(user: User, cost: number): Promise<void>{
        user.token -= cost;
        await user.save();
    }

    // checks if the user token amount is >= requested amount
    async checkUserToken(userId: number, amount: number): Promise<boolean> {
        const userDao = new UserDao();
        const user = await userDao.findById(userId);
        return !(user instanceof User && user.token < amount);
    }


    async getDatasetDetail(datasetId: number): Promise<Dataset | ConcreteErrorCreator> {
        try{
            const datasetDao: DatasetDao = new DatasetDao();
            const dataset: Dataset | ConcreteErrorCreator = await datasetDao.findById(datasetId);
            if( dataset !== null && dataset !== undefined ){
                return dataset
            }else{
                throw new ConcreteErrorCreator().createNotFoundError().setAbstentDataset();
            }
        } catch {
            throw new ConcreteErrorCreator().createNotFoundError().setAbstentDataset();
        }
    }

    
    // updates the number of elements of a dataset
    public async updateCountDataset(datasetId: number, num: number): Promise<Dataset|ConcreteErrorCreator> {
        const datasetDao = new DatasetDao();
        return datasetDao.updateCount(datasetId, num);
    }

    async generateUUID(): Promise<string> {
        const resuldDao = new ResultDao();
        let unique: boolean = false;
        let uuid: string = "";
        while (!unique) {
            uuid = uuidv4();
            if(!(await resuldDao.findOneByResultId(uuid))){
                unique = true;
            }
        }
        return uuid;
    }


    async getTags(datasetId: number): Promise<string[]> {
        const datasetTagDao = new DatasetTagDAO();
        return await datasetTagDao.findAllByDatasetId(datasetId);
    }


    async listImageFromDataset(datasetId: number): Promise<Image[] | ConcreteErrorCreator> {
        const imageDao: ImageDao = new ImageDao();
        return imageDao.findAllImmagineByDatasetId(datasetId);
    }



    async createListResult(imageList: Image[], aiID: number, UUID: string): Promise<Result[] | ConcreteErrorCreator> {
        const results: Result[] = [];
        for (const image of imageList) {
            try {
                const res: ResultDao = new ResultDao()
                const result: Result | ConcreteErrorCreator = await res.initCreation(image.id, aiID, UUID);
                if (result instanceof ConcreteErrorCreator) {
                    throw result;
                }
                results.push(result);
            } catch (error) {
                if (error instanceof ConcreteErrorCreator) {
                    return error;
                } else {
                    throw new ConcreteErrorCreator().createServerError().setFailedCreationResult();
                }
            }
        }

        return results;
    }
}










