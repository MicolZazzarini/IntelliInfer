import Ai from "../models/ai";
import Dataset from "../models/dataset";
import Image from "../models/image";
import Label from "../models/label";
import Result from "../models/result";
import Tag from "../models/tag";
import User from "../models/user";


const syncDb = async () => {
      await User.sync();
      await Image.sync();
      await Ai.sync();
      await Dataset.sync();
      await Label.sync();
      await Result.sync();
      await Tag.sync();
};
  
export { User, Image, Ai, Dataset, Label, Result, Tag, syncDb };

