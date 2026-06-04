import appJson from '../../app.json';

export interface AppVersion {
  version: string;
  buildNumber: number;
  display: string;
}

const { version, buildNumber } = appJson.expo;

export const APP_VERSION: AppVersion = {
  version,
  buildNumber: buildNumber as number,
  display: `${version} (${buildNumber})`,
};
