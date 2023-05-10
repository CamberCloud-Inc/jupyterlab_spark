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
  id: 'jupyterlab_spark:plugin',
  autoStart: true,
  requires: [ICommandPalette],
  activate:(app: JupyterFrontEnd, palette: ICommandPalette) => {
    console.log('JupyterLab extension jupyterlab_spark is activated!');

    const { commands } = app;
    const command = "spark-ui:open";

    function newSparkUIWidget(): MainAreaWidget {
      let content = new IFrame({sandbox: ['allow-forms', 'allow-same-origin', 'allow-scripts']});
      content.url = 'http://localhost:4040/';
      content.title.label = 'Spark UI';
      content.id = 'camber-spark-ui';
      return new MainAreaWidget({content});
    }

    commands.addCommand(command, {
      label: "Spark App UI",
      caption: "Open the Spark App UI",
      execute: (args: any) => {
        let widget =  newSparkUIWidget();
        // Regenerate the widget if disposed
        if (widget.isDisposed) {
          widget = newSparkUIWidget();
        }
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
      category
    });
  }
};

export default extension;