import { useReducer, useState } from "react";
import Graph from "./Graph";
import main from "./prompt/prompt.txt";
import { graphReducer, initialState } from "./graphReducer";
import { ACTIONS } from "./actions";
import {
  cleanJSONTuples,
  cleanTuples,
  exportData,
  restructureGraph,
  tuplesToGraph,
} from "./util";
import "./App.css";
import { DEFAULT_PARAMS, LAYOUTS, requestOptions, ENDPOINTS } from "./constants";
import GithubLogo from "./github-mark.png";
import LayoutSelector from "./LayoutSelector";

function App() {
  const [prompt, setPrompt] = useState("");
  const handlePromptChange = (e) => setPrompt(e.target.value);

  const [graphState, dispatch] = useReducer(graphReducer, initialState);
  const [option, setOptions] = useState(LAYOUTS.FCOSE);
  const [loading, setLoading] = useState(false);

  const [key, setKey] = useState("");
  const handleKeyChange = (e) => setKey(e.target.value);

  // NEW: endpoint selection (default: OpenRouter)
  const [endpointKey, setEndpointKey] = useState("OPENROUTER");
  const handleEndpointChange = (e) => setEndpointKey(e.target.value);

  const [file, setFile] = useState("");

  const handleJSONImport = (e) => {
    const fileReader = new FileReader();
    fileReader.readAsText(e.target.files[0], "UTF-8");
    fileReader.onload = (e2) => {
      let data;
      try {
        data = JSON.parse(e2.target.result);
      } catch (err) {
        console.info(err);
      }
      setFile(null);
      const result = restructureGraph(tuplesToGraph(cleanJSONTuples(data)));
      dispatch({ type: ACTIONS.ADD_NODES_AND_EDGES, payload: result });
    };
  };

  const fetchGraph = () => {
    setLoading(true);
    fetch(main)
      .then((res) => res.text())
      .then((text) => text.replace("$prompt", prompt))
      .then((promptText) => {
        const params = {
          ...DEFAULT_PARAMS,
          messages: [{ role: "system", content: promptText }],
        };

        // Choose URL from dropdown
        const url = ENDPOINTS[endpointKey];

        // Compose headers
        const hdrs = {
          ...requestOptions.headers,
          Authorization: "Bearer " + key,
        };

        // Optional: OpenRouter-friendly header (browser automatically sends Referer)
        if (endpointKey === "OPENROUTER") {
          hdrs["X-Title"] = "KnowledgeGraph GPT";
        }

        return fetch(url, {
          ...requestOptions,
          headers: hdrs,
          body: JSON.stringify(params),
        });
      })
      .then((response) => response.json())
      .then((data) => {
        setLoading(false);
        const text = data?.choices?.[0]?.message?.content || "";
        const result = restructureGraph(tuplesToGraph(cleanTuples(text)));
        dispatch({ type: ACTIONS.ADD_NODES_AND_EDGES, payload: result });
      })
      .catch((error) => {
        setLoading(false);
        console.log(error);
        alert("Request failed. Check console and verify endpoint, model, and API key.");
      });
  };

  const handleSubmit = () => fetchGraph();

  return (
    <div className="App">
      <div className="mainContainer">
        <h1 className="title">KnowledgeGraph GPT</h1>
        <p className="text">
          Convert unstructured text into a knowledge graph using your chosen LLM provider.
        </p>

        {/* NEW: Endpoint selector */}
        <div style={{ marginBottom: 10 }}>
          <label style={{ marginRight: 8, color: "#555" }}>API Endpoint:</label>
          <select value={endpointKey} onChange={handleEndpointChange}>
            <option value="OPENROUTER">OpenRouter (default)</option>
            <option value="OPENAI">OpenAI</option>
          </select>
        </div>

        <input
          type="password"
          onChange={handleKeyChange}
          value={key}
          className="keyInput"
          placeholder={
            endpointKey === "OPENROUTER"
              ? "Enter your OpenRouter API Key"
              : "Enter your OpenAI API Key"
          }
        />
        <br />
        <input
          type="text"
          onChange={handlePromptChange}
          value={prompt}
          className="promptInput"
          placeholder="Enter your prompt"
        />

        <button
          onClick={handleSubmit}
          className="submitButton"
          disabled={loading || key.length < 1}
        >
          {loading ? "Loading" : "Generate"}
        </button>
        <br />

        <div className="buttonContainer">
          <button
            className="submitButton"
            style={{ marginLeft: 5 }}
            onClick={() => dispatch({ type: ACTIONS.CLEAR_GRAPH })}
          >
            Clear
          </button>
          <button
            className="submitButton"
            style={{ marginLeft: 5 }}
            onClick={() => exportData(graphState?.edges)}
            disabled={graphState?.edges?.length < 1}
          >
            Export JSON
          </button>
          <label className="custom-file-upload">
            <input
              type="file"
              accept=".json"
              onChange={handleJSONImport}
              value={file}
            />
            Import JSON
          </label>
          <LayoutSelector option={option} setOptions={setOptions} />
        </div>
      </div>
      <Graph data={graphState} layout={option} />
      <div className="footer">
        <p>Copyrights © {new Date().getFullYear()}</p>
        <a
          href="https://github.com/iAmmarTahir/KnowledgeGraphGPT"
          target="_blank"
          rel="noreferrer"
        >
          <img
            src={GithubLogo}
            alt="github"
            width={20}
            height={20}
            className="github"
          />
        </a>
      </div>
    </div>
  );
}
export default App;
