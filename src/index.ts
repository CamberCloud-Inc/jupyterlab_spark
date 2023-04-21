import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette,
  IFrame,
  MainAreaWidget
} from '@jupyterlab/apputils';

const extension: JupyterFrontEndPlugin<void> = {
  id: 'main-menu',
  autoStart: true,
  requires: [ICommandPalette],
  activate:(app: JupyterFrontEnd, palette: ICommandPalette) => {
    console.log('JupyterLab extension jupyterlab_spark is activated!');

    const { commands } = app;
    const command = "spark-ui:open";

    let namespace = 'spark-ui';
    let counter = 0;
    function newMainAreaWidget(url: string, text: string): MainAreaWidget {
      let content = new IFrame({sandbox: ['allow-forms', 'allow-same-origin', 'allow-scripts']});
      content.url = url;
      content.title.label = text;
      content.id = `${namespace}-${++counter}`;
      return new MainAreaWidget({content});
    }

    commands.addCommand(command, {
      label: "Spark App UI",
      caption: "Open the Spark App UI",
      execute: (args: any) => {
        const url = 'http://localhost:4040/';
        let widget =  newMainAreaWidget(url, 'Spark App UI');
        if (!widget.isAttached) {
          // Attach the widget to the main work area if it's not there
          app.shell.add(widget, "main");
        }
        // Activate the widget
        app.shell.activateById(widget.id);
      }
    });

    const category = "Spark";
    palette.addItem({
      command,
      category,
      args: { origin: 'from the palette' },
    });
  }
};

export default extension;