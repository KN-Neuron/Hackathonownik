import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';

export interface AppConfig {
  event: {
    name: string;
    year: string | number;
    organizer: string;
    deadline: string;
    categories: Array<{
      key: string;
      name: string;
      color: string;
    }>;
    rating_criteria: Array<{
      key: string;
      name: string;
      maxScore: number;
      description?: string;
    }>;
    links: Array<{
      title: string;
      description: string;
      url: string;
      buttonText: string;
    }>;
    schedule: Array<{
      day: string;
      events: Array<{
        time: string;
        description: string;
      }>;
    }>;
  };
}

const configPath = path.resolve('app_config.yaml');
const fileContents = fs.readFileSync(configPath, 'utf8');
export const appConfig = yaml.load(fileContents) as AppConfig;
