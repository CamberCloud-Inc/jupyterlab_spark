import {
    JupyterFrontEnd,
    JupyterFrontEndPlugin
} from '@jupyterlab/application';

import {
    IFrame,
    ICommandPalette,
    MainAreaWidget
} from '@jupyterlab/apputils';

import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';

const extension: JupyterFrontEndPlugin<void>  = {
    id: 'jupyterlab_spark:plugin',
    autoStart: true,
    requires: [ICommandPalette],
    activate:(app: JupyterFrontEnd, palette: ICommandPalette) => {
        console.log('JupyterLab SparkMonitor is activated!');

        function newSparkUI(port: string): MainAreaWidget {
            const content = new IFrame({sandbox: ['allow-forms', 'allow-scripts']});
            const url: URLExt.join(ServerConnection.makeSettings().baseUrl, 'sparkmonitor', port);

            content.url = url;
            content.title.label = 'Spark UI';
            content.id = `spark-ui-${port}`;

            return new MainAreaWidget({content});
        }

        const command = 'spark-ui:open';
        app.commands.addCommand(command, {
            label: 'Open Spark UI',
            caption: 'Open the Spark App UI',
            execute: () => {
                console.log('show spark UI');
                const port = '4040';
                let sparkUI = newSparkUI(port);
                if (sparkUI.isDisposed) {
                    sparkUI = newSparkUI(port);
                }
                if (!sparkUI.isAttached) {
                    app.shell.add(sparkUI, 'main');
                }
                app.shell.activateById(sparkUI.id);
            },
        });

        const category = 'Spark';
        palette.addItem({
            command,
            category
        });
    },
};

export default extension;