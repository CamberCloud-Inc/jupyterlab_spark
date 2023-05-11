import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
} from "@jupyterlab/application";

import { ICommandPalette, MainAreaWidget } from "@jupyterlab/apputils";

import { Widget } from "@lumino/widgets";
import { URLExt } from "@jupyterlab/coreutils";
import { ServerConnection } from "@jupyterlab/services";

const extension: JupyterFrontEndPlugin<void> = {
  id: "jupyterlab_spark:plugin",
  autoStart: true,
  requires: [ICommandPalette],
  activate: (app: JupyterFrontEnd, palette: ICommandPalette) => {
    console.log("JupyterLab SparkMonitor is activated!");
    function newSparkUI(port: string): MainAreaWidget {
      const content = new Widget();
      const widget = new MainAreaWidget({ content });
      const iframe = document.createElement("iframe");
      content.node.appendChild(iframe);

      const url = URLExt.join(
        ServerConnection.makeSettings().baseUrl,
        "sparkmonitor",
        port
      );
      iframe.setAttribute("style", "width:100%;height:100%;border:0");
      iframe.setAttribute("src", url);
      iframe.setAttribute("class", "sparkUIIFrame");

      widget.id = `spark-ui-${port}`;
      widget.title.label = "Spark UI";
      widget.title.closable = true;

      return new MainAreaWidget({ content });
    }

    const command = "spark-ui:open";
    app.commands.addCommand(command, {
      label: "Open Spark UI",
      caption: "Open the Spark App UI",
      execute: () => {
        console.log("show spark UI");
        const port = "4040";
        let sparkUI = newSparkUI(port);
        if (sparkUI.isDisposed) {
          sparkUI = newSparkUI(port);
        }
        if (!sparkUI.isAttached) {
          app.shell.add(sparkUI, "main");
        }
        app.shell.activateById(sparkUI.id);
      },
    });

    const category = "Spark";
    palette.addItem({
      command,
      category,
    });
  },
};

export default extension;
