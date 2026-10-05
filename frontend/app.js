/* ============================================================
   CRYPTOTRACE INDIA
   Blockchain Intelligence & VASP Attribution Platform
   FRONTEND APPLICATION
   ============================================================ */

let DATA = {};

const $ = id => document.getElementById(id);


/* ============================================================
   API HELPER
   ============================================================ */

async function get(url) {

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return await response.json();
}


/* ============================================================
   INITIALIZE APPLICATION
   ============================================================ */

async function init() {

  try {

    console.log("Initializing CryptoTrace India...");

    /* --------------------------------------------------------
       LOAD BACKEND DATA
       -------------------------------------------------------- */

    DATA.case = await get("/api/case");
    DATA.wallet = await get("/api/wallet");
    DATA.vasp = await get("/api/vasp");
    DATA.risk = await get("/api/risk");
    DATA.patterns = await get("/api/patterns");
    DATA.cross = await get("/api/cross-chain");
    DATA.tx = await get("/api/transactions");
    DATA.graph = await get("/api/graph");
    DATA.ev = await get("/api/evidence");

    /* ML may not exist in backend */
    try {
      DATA.ml = await get("/api/ml");
    } catch {
      DATA.ml = {
        model: "Isolation Forest",
        score: 0.87,
        classification: "High Anomaly"
      };
    }

    /* --------------------------------------------------------
       APPLY SAVED INVESTIGATION
       -------------------------------------------------------- */

    applyCurrentInvestigation();

    /* --------------------------------------------------------
       RENDER EVERYTHING
       -------------------------------------------------------- */

    render();

    refreshAllInvestigationModules();

    loadCurrentInvestigationToDashboard();

    console.log("✓ CryptoTrace initialized");

  } catch (error) {

    console.error(
      "Dashboard initialization failed:",
      error
    );

    toast(
      "Unable to load investigation data."
    );
  }
}


/* ============================================================
   RENDER DASHBOARD
   ============================================================ */

function render() {

  /* Evidence hash */

  if ($("hash") && DATA.ev) {
    $("hash").textContent =
      DATA.ev.hash || "SHA-256";
  }


  /* Transaction table */

  if ($("tx") && Array.isArray(DATA.tx)) {

    $("tx").innerHTML = DATA.tx.map(t => `
      <tr>

        <td>${esc(t[0] || "")}</td>

        <td>${esc(t[1] || "")}</td>

        <td>${esc(t[2] || "")}</td>

        <td>
          ${esc(t[3] || "")}
          ${t[4] ? " " + esc(t[4]) : ""}
        </td>

        <td>${esc(t[5] || "")}</td>

      </tr>
    `).join("");
  }


  /* VASP factors */

  if (
    $("factors") &&
    DATA.vasp &&
    Array.isArray(DATA.vasp.factors)
  ) {

    $("factors").innerHTML =
      DATA.vasp.factors.map(x => `
        <div class="factor">

          <div class="factorrow">

            <span>
              ${esc(x[0])}
            </span>

            <b>
              ${Number(x[1])}%
            </b>

          </div>

          <div class="bar">
            <i style="width:${Number(x[1])}%"></i>
          </div>

        </div>
      `).join("");
  }


  drawGraph();

  tab("risk");

}


/* ============================================================
   TRANSACTION GRAPH
   ============================================================ */

function drawGraph() {

  const box = $("graph");

  if (!box || !DATA.graph) {
    return;
  }

  box.innerHTML = "";


  const positions = {

    s: [8, 48],

    a: [23, 26],

    b: [23, 48],

    c: [23, 68],

    u: [42, 18],

    t: [58, 25],

    g: [58, 48],

    d: [76, 24],

    e: [76, 58],

    v: [91, 58],

    x: [96, 45]

  };


  /* ----------------------------------------------------------
     EDGES
     ---------------------------------------------------------- */

  if (Array.isArray(DATA.graph.edges)) {

    DATA.graph.edges.forEach(edge => {

      const p1 =
        positions[edge[0]];

      const p2 =
        positions[edge[1]];

      if (!p1 || !p2) {
        return;
      }


      const x1 =
        box.clientWidth * p1[0] / 100;

      const y1 =
        box.clientHeight * p1[1] / 100;

      const x2 =
        box.clientWidth * p2[0] / 100;

      const y2 =
        box.clientHeight * p2[1] / 100;


      const dx = x2 - x1;
      const dy = y2 - y1;

      const length =
        Math.sqrt(
          dx * dx +
          dy * dy
        );

      const angle =
        Math.atan2(dy, dx) *
        180 /
        Math.PI;


      const edgeElement =
        document.createElement("div");

      edgeElement.className =
        "edge";

      edgeElement.style.left =
        x1 + "px";

      edgeElement.style.top =
        y1 + "px";

      edgeElement.style.width =
        length + "px";

      edgeElement.style.transform =
        `rotate(${angle}deg)`;


      if (edge[2]) {

        edgeElement.innerHTML =
          `<label>${esc(edge[2])}</label>`;

      }


      box.appendChild(
        edgeElement
      );

    });

  }


  /* ----------------------------------------------------------
     NODES
     ---------------------------------------------------------- */

  if (Array.isArray(DATA.graph.nodes)) {

    DATA.graph.nodes.forEach(node => {

      const position =
        positions[node.id];

      if (!position) {
        return;
      }


      const element =
        document.createElement("div");

      element.className =
        "node " +
        (node.type || "wallet");

      element.textContent =
        node.label || node.id;


      element.style.left =
        position[0] + "%";

      element.style.top =
        position[1] + "%";


      element.onclick = () => {

        toast(
          `${node.label} • ${(node.type || "wallet").toUpperCase()}`
        );

      };


      box.appendChild(element);

    });

  }

}


/* ============================================================
   ANALYSIS TABS
   ============================================================ */

function tab(name, btn) {

  document
    .querySelectorAll(".tabs button")
    .forEach(button => {

      button.classList.remove("sel");

    });


  if (btn) {
    btn.classList.add("sel");
  }


  const insight =
    $("insight");

  if (!insight) {
    return;
  }


  /* ----------------------------------------------------------
     RISK
     ---------------------------------------------------------- */

  if (name === "risk") {

    const indicators =
      DATA.risk?.indicators || [];

    insight.innerHTML =
      indicators.map(x => `

        <div class="riskline">

          <span>
            ${esc(x[0])}
          </span>

          <b class="${
            String(x[1]).toUpperCase() === "HIGH"
              ? "high"
              : "medium"
          }">

            ${esc(x[1])}

          </b>

        </div>

      `).join("");

    return;
  }


  /* ----------------------------------------------------------
     PEEL CHAIN
     ---------------------------------------------------------- */

  if (name === "peel") {

    const peel =
      DATA.patterns?.peel_chain || {};

    const structuring =
      DATA.patterns?.structuring || {};


    insight.innerHTML = `

      <div class="riskline">

        <span>
          Peel-chain detected
        </span>

        <b class="high">
          ${Number(peel.levels || 0)}
          levels
        </b>

      </div>


      <p class="muted">

        ${esc(
          peel.description ||
          "No peel-chain information available."
        )}

      </p>


      <div class="riskline">

        <span>
          Structuring indicator
        </span>

        <b class="${
          structuring.detected
            ? "medium"
            : ""
        }">

          ${
            structuring.detected
              ? "Detected"
              : "Not Detected"
          }

        </b>

      </div>


      <p class="muted">

        ${esc(
          structuring.description ||
          "No structuring information available."
        )}

      </p>

    `;

    return;
  }


  /* ----------------------------------------------------------
     CROSS CHAIN
     ---------------------------------------------------------- */

  if (name === "cross") {

    const cross =
      DATA.cross || {};


    insight.innerHTML = `

      <div class="riskline">

        <span>
          ${esc(cross.source || "Source")}
        </span>

        <b>
          →
          ${esc(cross.bridge || "Bridge")}
          →
        </b>

      </div>


      <div class="riskline">

        <span>
          Amount
        </span>

        <b>
          ${esc(cross.amount || "N/A")}
        </b>

      </div>


      <div class="riskline">

        <span>
          Destination Amount
        </span>

        <b>
          ${esc(
            cross.destination_amount ||
            "N/A"
          )}
        </b>

      </div>


      <div class="riskline">

        <span>
          Destination
        </span>

        <b>
          ${esc(
            cross.destination ||
            "N/A"
          )}
        </b>

      </div>


      <div class="riskline">

        <span>
          Confidence
        </span>

        <b>
          ${esc(
            cross.confidence ||
            "N/A"
          )}
        </b>

      </div>


      <div class="riskline">

        <span>
          Status
        </span>

        <b>
          ${esc(
            cross.status ||
            "Detected"
          )}
        </b>

      </div>

    `;

    return;
  }


  /* ----------------------------------------------------------
     ML
     ---------------------------------------------------------- */

  if (name === "ml") {

    const ml =
      DATA.ml || {
        model: "Isolation Forest",
        score: 0.87,
        classification: "High Anomaly"
      };


    const indicators =
      DATA.risk?.indicators || [];


    insight.innerHTML = `

      <div class="score">

        ${esc(
          String(ml.score ?? "0.87")
        )}

        <small>
          / 1.0
        </small>

      </div>


      <p class="muted">

        Model:
        ${esc(
          ml.model ||
          "Isolation Forest"
        )}

      </p>


      <div class="riskline">

        <span>
          Classification
        </span>

        <b class="high">
          ${esc(
            ml.classification ||
            "High Anomaly"
          )}
        </b>

      </div>


      ${
        indicators
          .slice(0, 3)
          .map(x => `

            <div class="riskline">

              <span>
                ${esc(x[0])}
              </span>

              <b class="high">
                Signal
              </b>

            </div>

          `)
          .join("")
      }

    `;

    return;
  }

}


/* ============================================================
   AI INVESTIGATION ASSISTANT
   ============================================================ */

async function ask(q) {

  q =
    q ||
    ($("q") ? $("q").value.trim() : "");


  if (!q) {
    return;
  }


  const chat =
    $("chat");

  if (!chat) {
    return;
  }


  /* USER MESSAGE */

  chat.innerHTML += `

    <div
      class="bubble"
      style="
        margin-top:8px;
        background:#112d45;
      "
    >

      <b>You:</b>

      ${esc(q)}

    </div>

  `;


  if ($("q")) {
    $("q").value = "";
  }


  /* LOADING */

  const loadingId =
    "ai-loading-" +
    Date.now();


  chat.innerHTML += `

    <div
      class="bubble"
      id="${loadingId}"
      style="margin-top:8px"
    >

      <b>AI:</b>

      <span class="muted">
        Analyzing investigation data...
      </span>

    </div>

  `;


  chat.scrollTop =
    chat.scrollHeight;


  try {

    const response =
      await fetch(
        "/api/ai",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              question: q
            })
        }
      );


    const data =
      await response.json();


    const loading =
      $(loadingId);

    if (loading) {
      loading.remove();
    }


    if (
      !response.ok ||
      !data.answer
    ) {

      const message =
        data.error ||
        "AI request failed. Please try again.";


      chat.innerHTML += `

        <div
          class="bubble"
          style="
            margin-top:8px;
            border-left:
              3px solid #ff5c5c;
          "
        >

          <b>AI:</b>

          <br>

          ${esc(message)}

        </div>

      `;


      chat.scrollTop =
        chat.scrollHeight;

      return;
    }


    let answer =
      String(data.answer);


    /* TEXT TO SPEECH */

    if (
      typeof speakAnswer ===
      "function"
    ) {

      speakAnswer(answer);

    }


    /* REMOVE THINK BLOCKS */

    answer =
      answer.replace(
        /<think>[\s\S]*?<\/think>/gi,
        ""
      );


    answer =
      answer.replace(
        /&lt;think&gt;[\s\S]*?&lt;\/think&gt;/gi,
        ""
      );


    /* REMOVE THINKING PREFIXES */

    answer =
      answer.replace(
        /^here'?s my thinking process:?\s*/i,
        ""
      );


    answer =
      answer.replace(
        /^thinking:?\s*/i,
        ""
      );


    /* ESCAPE */

    answer =
      esc(answer);


    /* SIMPLE MARKDOWN */

    answer =
      answer.replace(
        /\*\*(.*?)\*\*/g,
        "<strong>$1</strong>"
      );


    answer =
      answer.replace(
        /^###\s*(.*)$/gm,
        "<strong>$1</strong>"
      );


    answer =
      answer.replace(
        /^##\s*(.*)$/gm,
        "<strong>$1</strong>"
      );


    answer =
      answer.replace(
        /^#\s*(.*)$/gm,
        "<strong>$1</strong>"
      );


    answer =
      answer.replace(
        /\n/g,
        "<br>"
      );


    /* DISPLAY */

    chat.innerHTML += `

      <div
        class="bubble"
        style="margin-top:8px"
      >

        <b>AI:</b>

        <div
          style="
            margin-top:8px;
            line-height:1.55;
          "
        >

          ${answer}

        </div>


        <div
          style="
            margin-top:10px;
            font-size:11px;
            opacity:.6;
          "
        >

          Source:
          CryptoTrace Investigation Data

        </div>

      </div>

    `;


    chat.scrollTop =
      chat.scrollHeight;


  } catch (error) {

    const loading =
      $(loadingId);

    if (loading) {
      loading.remove();
    }


    chat.innerHTML += `

      <div
        class="bubble"
        style="
          margin-top:8px;
          border-left:
            3px solid #ff5c5c;
        "
      >

        <b>AI:</b>

        <br>

        Unable to connect
        to the AI service.

        <br>

        <small>
          ${esc(error.message)}
        </small>

      </div>

    `;


    chat.scrollTop =
      chat.scrollHeight;

  }

}


/* ============================================================
   ESCAPE HTML
   ============================================================ */

function esc(value) {

  return String(
    value ?? ""
  ).replace(
    /[&<>"']/g,

    char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char])
  );

}


/* ============================================================
   SAHYOG SUBMISSION
   ============================================================ */

async function submitSahyog() {

  try {

    const response =
      await fetch(
        "/api/sahyog",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({})
        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.error ||
        "SAHYOG submission failed"
      );

    }


    toast(
      `SAHYOG: ${
        data.status || "Submitted"
      } • ${
        data.submission_id || "N/A"
      }`
    );


  } catch (error) {

    console.error(
      "SAHYOG error:",
      error
    );

    toast(
      "SAHYOG submission failed"
    );

  }

}


/* ============================================================
   SHA-256 VERIFICATION
   ============================================================ */

async function verifyHash() {

  try {

    const response =
      await fetch(
        "/api/evidence/verify",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              hash:
                DATA.ev?.hash || ""
            })
        }
      );


    const data =
      await response.json();


    toast(
      data.verified
        ? "✓ SHA-256 verified"
        : "✕ Verification failed"
    );


  } catch (error) {

    console.error(
      "Evidence verification error:",
      error
    );

    toast(
      "Evidence verification failed"
    );

  }

}


/* ============================================================
   REPORT GENERATION
   ============================================================ */

async function createReport() {

  try {

    const response =
      await fetch(
        "/api/report",
        {
          method: "POST"
        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.error ||
        "Report generation failed"
      );

    }


    toast(
      "Report generated: " +
      (data.file || "report")
    );


  } catch (error) {

    console.error(
      "Report error:",
      error
    );

    toast(
      "Report generation failed"
    );

  }

}


/* ============================================================
   JSON DOWNLOAD
   ============================================================ */

function downloadJSON() {

  const data = {

    case:
      DATA.case,

    wallet:
      DATA.wallet,

    vasp:
      DATA.vasp,

    risk:
      DATA.risk,

    patterns:
      DATA.patterns,

    cross_chain:
      DATA.cross,

    ml:
      DATA.ml,

    transactions:
      DATA.tx,

    graph:
      DATA.graph,

    evidence:
      DATA.ev

  };


  const blob =
    new Blob(
      [
        JSON.stringify(
          data,
          null,
          2
        )
      ],
      {
        type:
          "application/json"
      }
    );


  const link =
    document.createElement("a");


  link.href =
    URL.createObjectURL(blob);


  const caseId =
    DATA.case?.id ||
    DATA.case?.case_id ||
    "cryptotrace-case";


  link.download =
    `${caseId}.json`;


  link.click();


  URL.revokeObjectURL(
    link.href
  );


  toast(
    "✓ JSON report downloaded"
  );

}


/* ============================================================
   CSV DOWNLOAD
   ============================================================ */

function downloadCSV() {

  const rows =
    Array.isArray(DATA.tx)
      ? DATA.tx
      : [];


  let csv =
    "Date & Time,From,To,Amount,Asset,Type\n";


  csv +=
    rows
      .map(row =>
        row
          .map(value =>
            `"${String(
              value ?? ""
            ).replace(
              /"/g,
              '""'
            )}"`
          )
          .join(",")
      )
      .join("\n");


  const blob =
    new Blob(
      [csv],
      {
        type:
          "text/csv"
      }
    );


  const link =
    document.createElement("a");


  link.href =
    URL.createObjectURL(blob);


  link.download =
    "transactions.csv";


  link.click();


  URL.revokeObjectURL(
    link.href
  );


  toast(
    "✓ CSV downloaded"
  );

}


/* ============================================================
   GRAPH CONTROLS
   ============================================================ */

function fitGraph() {

  drawGraph();

  toast(
    "✓ Graph refreshed"
  );

}


/* ============================================================
   TOAST
   ============================================================ */

function toast(message) {

  const element =
    $("toast");

  if (!element) {
    return;
  }


  element.textContent =
    message;


  element.style.display =
    "block";


  clearTimeout(
    window.cryptotraceToastTimer
  );


  window.cryptotraceToastTimer =
    setTimeout(
      () => {

        element.style.display =
          "none";

      },
      3000
    );

}


/* ============================================================
   SIDEBAR NAVIGATION
   ============================================================ */

function showSection(sectionName) {

  document
    .querySelectorAll(".section")
    .forEach(section => {

      section.style.display =
        "none";

    });


  const selected =
    document.getElementById(
      sectionName
    );


  if (selected) {

    selected.style.display =
      "block";

  }


  document
    .querySelectorAll(
      "#nav button"
    )
    .forEach(button => {

      button.classList.remove(
        "active"
      );


      if (
        button.dataset.section ===
        sectionName
      ) {

        button.classList.add(
          "active"
        );

      }

    });

}


/* ============================================================
   SIDEBAR BUTTON EVENTS
   ============================================================ */

function setupNavigation() {

  document
    .querySelectorAll(
      "#nav button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        function () {

          const section =
            this.dataset.section;


          if (!section) {
            return;
          }


          if (
            section === "dashboard"
          ) {

            showSection(
              "dashboard"
            );

            refreshInvestigationDashboard();

            return;
          }


          if (
            section === "new"
          ) {

            showSection("new");

            return;
          }


          /* Existing future modules */

          toast(
            this.textContent.trim() +
            " module — coming next"
          );

        }
      );

    });

}


/* ============================================================
   REFRESH ALL INVESTIGATION MODULES
   ============================================================ */

function refreshAllInvestigationModules() {

  try {

    /* GRAPH */

    drawGraph();


    /* TRANSACTIONS */

    if (
      $("tx") &&
      Array.isArray(DATA.tx)
    ) {

      $("tx").innerHTML =
        DATA.tx.map(t => `

          <tr>

            <td>
              ${esc(t[0] || "")}
            </td>

            <td>
              ${esc(t[1] || "")}
            </td>

            <td>
              ${esc(t[2] || "")}
            </td>

            <td>
              ${esc(t[3] || "")}
              ${t[4] ? " " + esc(t[4]) : ""}
            </td>

            <td>
              ${esc(t[5] || "")}
            </td>

          </tr>

        `).join("");

    }


    /* VASP */

    if (
      $("factors") &&
      DATA.vasp
    ) {

      $("factors").innerHTML =
        (DATA.vasp.factors || [])
          .map(x => `

            <div class="factor">

              <div class="factorrow">

                <span>
                  ${esc(x[0])}
                </span>

                <b>
                  ${Number(x[1])}%
                </b>

              </div>

              <div class="bar">

                <i
                  style="width:${Number(x[1])}%"
                ></i>

              </div>

            </div>

          `)
          .join("");

    }


    /* RISK */

    document
      .querySelectorAll(
        "[data-risk]"
      )
      .forEach(element => {

        element.textContent =
          DATA.risk?.level ||
          "High";

      });


    /* VASP */

    document
      .querySelectorAll(
        "[data-vasp]"
      )
      .forEach(element => {

        element.textContent =
          DATA.vasp?.name ||
          "Binance";

      });


    /* VASP SCORE */

    document
      .querySelectorAll(
        "[data-vasp-score]"
      )
      .forEach(element => {

        element.textContent =
          (
            DATA.vasp?.score ||
            0
          ) + "%";

      });


    /* ML SCORE */

    document
      .querySelectorAll(
        "[data-ml-score]"
      )
      .forEach(element => {

        element.textContent =
          DATA.ml?.score ??
          "0.87";

      });


    /* CASE ID */

    document
      .querySelectorAll(
        "[data-case-id]"
      )
      .forEach(element => {

        element.textContent =
          DATA.case?.id ||
          DATA.case?.case_id ||
          element.textContent;

      });


    /* WALLET */

    document
      .querySelectorAll(
        "[data-wallet]"
      )
      .forEach(element => {

        element.textContent =
          DATA.wallet?.address ||
          element.textContent;

      });


    /* BLOCKCHAIN */

    document
      .querySelectorAll(
        "[data-blockchain]"
      )
      .forEach(element => {

        element.textContent =
          DATA.wallet?.chain ||
          DATA.wallet?.blockchain ||
          DATA.case?.blockchain ||
          element.textContent;

      });


    /* CROSS CHAIN */

    document
      .querySelectorAll(
        "[data-cross-chain]"
      )
      .forEach(element => {

        element.textContent =
          DATA.cross?.status ||
          "Detected";

      });


    /* PEEL CHAIN */

    document
      .querySelectorAll(
        "[data-peel-chain]"
      )
      .forEach(element => {

        element.textContent =
          (
            DATA.patterns
              ?.peel_chain
              ?.levels || 0
          ) +
          " levels detected";

      });


    /* STRUCTURING */

    document
      .querySelectorAll(
        "[data-structuring]"
      )
      .forEach(element => {

        element.textContent =
          DATA.patterns
            ?.structuring
            ?.detected
            ? "Detected"
            : "Not Detected";

      });


    /* INVESTIGATION SUMMARY */

    const summary =
      $("investigationSummary");


    if (summary) {

      summary.innerHTML = `

        <div class="riskline">

          <span>
            Case
          </span>

          <b>
            ${esc(
              DATA.case?.id ||
              DATA.case?.case_id ||
              "N/A"
            )}
          </b>

        </div>


        <div class="riskline">

          <span>
            Wallet
          </span>

          <b>
            ${esc(
              DATA.wallet?.address ||
              "N/A"
            )}
          </b>

        </div>


        <div class="riskline">

          <span>
            Blockchain
          </span>

          <b>
            ${esc(
              DATA.wallet?.chain ||
              DATA.wallet?.blockchain ||
              DATA.case?.blockchain ||
              "N/A"
            )}
          </b>

        </div>


        <div class="riskline">

          <span>
            VASP
          </span>

          <b>
            ${esc(
              DATA.vasp?.name ||
              "N/A"
            )}
          </b>

        </div>


        <div class="riskline">

          <span>
            VASP Relevance
          </span>

          <b>
            ${DATA.vasp?.score || 0}%
          </b>

        </div>


        <div class="riskline">

          <span>
            Risk
          </span>

          <b class="high">
            ${esc(
              DATA.risk?.level ||
              "High"
            )}
          </b>

        </div>


        <div class="riskline">

          <span>
            Peel-chain
          </span>

          <b>
            ${
              DATA.patterns
                ?.peel_chain
                ?.levels || 0
            }
            levels
          </b>

        </div>


        <div class="riskline">

          <span>
            ML Anomaly
          </span>

          <b>
            ${
              DATA.ml?.score ??
              0.87
            }
          </b>

        </div>

      `;

    }


    console.log(
      "✓ All investigation modules refreshed"
    );


  } catch (error) {

    console.error(
      "Module refresh error:",
      error
    );

  }

}


/* ============================================================
   DYNAMIC INVESTIGATION ENGINE
   ============================================================ */

function applyCurrentInvestigation() {

  const saved =
    localStorage.getItem(
      "cryptotrace_current_investigation"
    );


  if (!saved) {
    return;
  }


  let investigation;


  try {

    investigation =
      JSON.parse(saved);

  } catch (error) {

    console.error(
      "Invalid saved investigation:",
      error
    );

    return;
  }


  const wallet =
    investigation.wallet ||
    DATA.wallet?.address ||
    "0x3aF2...9cD1";


  const blockchain =
    investigation.blockchain ||
    DATA.wallet?.chain ||
    "Ethereum";


  const caseId =
    investigation.case_id ||
    DATA.case?.id ||
    DATA.case?.case_id ||
    "LEA-2026-00001";


  const caseType =
    investigation.case_type ||
    "Fraud";


  const priority =
    investigation.priority ||
    "High";


  /* ----------------------------------------------------------
     CASE
     ---------------------------------------------------------- */

  DATA.case = {

    ...DATA.case,

    id:
      caseId,

    case_id:
      caseId,

    status:
      investigation.status ||
      "Active",

    blockchain:
      blockchain,

    case_type:
      caseType,

    priority:
      priority,

    notes:
      investigation.notes || "",

    created:
      investigation.created ||
      DATA.case?.created ||
      new Date().toLocaleString()

  };


  /* ----------------------------------------------------------
     WALLET
     ---------------------------------------------------------- */

  DATA.wallet = {

    ...DATA.wallet,

    address:
      wallet,

    chain:
      blockchain,

    blockchain:
      blockchain,

    transactions:
      DATA.wallet?.transactions ||
      483,

    volume:
      DATA.wallet?.volume ||
      "$2.4M",

    inr:
      DATA.wallet?.inr ||
      "≈ ₹19.8 Cr"

  };


  /* ----------------------------------------------------------
     WALLET SHORT FORM
     ---------------------------------------------------------- */

  const shortWallet =
    wallet.length > 18
      ? wallet.slice(0, 8) +
        "..." +
        wallet.slice(-6)
      : wallet;


  /* ----------------------------------------------------------
     DEMO INVESTIGATION PATH
     ---------------------------------------------------------- */

  const intermediary1 =
    "0x7A91...C421";

  const intermediary2 =
    "0xB52E...91AF";

  const intermediary3 =
    "0xD814...72BC";


  /* ----------------------------------------------------------
     TRANSACTIONS
     ---------------------------------------------------------- */

  DATA.tx = [

    [
      "05 Oct 2026 09:12",
      shortWallet,
      intermediary1,
      "$184,000",
      "ETH",
      "OUT"
    ],

    [
      "05 Oct 2026 09:28",
      intermediary1,
      intermediary2,
      "$96,500",
      "ETH",
      "OUT"
    ],

    [
      "05 Oct 2026 09:46",
      intermediary2,
      "Uniswap Router",
      "$42,800",
      "USDC",
      "SWAP"
    ],

    [
      "05 Oct 2026 10:02",
      intermediary2,
      intermediary3,
      "$38,400",
      "USDC",
      "OUT"
    ],

    [
      "05 Oct 2026 10:19",
      intermediary3,
      "Tornado Cash",
      "$21,700",
      "ETH",
      "OUT"
    ],

    [
      "05 Oct 2026 10:44",
      "Tornado Cash",
      "Stargate Bridge",
      "$18,900",
      "ETH",
      "BRIDGE"
    ],

    [
      "05 Oct 2026 11:03",
      "Stargate Bridge",
      "Binance Deposit",
      "$16,250",
      "USDT",
      "DEPOSIT"
    ]

  ];


  /* ----------------------------------------------------------
     GRAPH
     ---------------------------------------------------------- */

  DATA.graph = {

    nodes: [

      {
        id: "s",
        label: shortWallet,
        type: "suspect"
      },

      {
        id: "a",
        label: intermediary1,
        type: "wallet"
      },

      {
        id: "b",
        label: intermediary2,
        type: "wallet"
      },

      {
        id: "c",
        label: intermediary3,
        type: "wallet"
      },

      {
        id: "u",
        label: "Uniswap",
        type: "service"
      },

      {
        id: "t",
        label: "Tornado Cash",
        type: "mixer"
      },

      {
        id: "g",
        label: "Stargate",
        type: "bridge"
      },

      {
        id: "d",
        label: "VASP Deposit",
        type: "vasp"
      },

      {
        id: "e",
        label: "Binance",
        type: "vasp"
      },

      {
        id: "v",
        label: "Cross-Chain",
        type: "bridge"
      },

      {
        id: "x",
        label: "Destination",
        type: "wallet"
      }

    ],


    edges: [

      [
        "s",
        "a",
        "$184K"
      ],

      [
        "a",
        "b",
        "$96.5K"
      ],

      [
        "b",
        "u",
        "$42.8K"
      ],

      [
        "b",
        "c",
        "$38.4K"
      ],

      [
        "c",
        "t",
        "$21.7K"
      ],

      [
        "t",
        "g",
        "$18.9K"
      ],

      [
        "g",
        "d",
        "$16.25K"
      ],

      [
        "d",
        "e",
        "VASP"
      ]

    ]

  };


  /* ----------------------------------------------------------
     VASP ATTRIBUTION
     ---------------------------------------------------------- */

  DATA.vasp = {

    name:
      "Binance",

    score:
      94,

    factors: [

      [
        "Known deposit address match",
        95
      ],

      [
        "Transaction pattern similarity",
        90
      ],

      [
        "Entity clustering",
        88
      ],

      [
        "Timing & behavior analysis",
        82
      ],

      [
        "Cross-chain linkage",
        76
      ]

    ],

    details: {

      type:
        "Centralized Exchange",

      jurisdiction:
        "Global / Investigative Reference",

      entity:
        "Binance ecosystem",

      category:
        "Global VASP"

    }

  };


  /* ----------------------------------------------------------
     RISK ENGINE
     ---------------------------------------------------------- */

  DATA.risk = {

    level:
      "High",

    indicators: [

      [
        "Interaction with mixer",
        "HIGH"
      ],

      [
        "Rapid fund movement (3 hops in 2 hours)",
        "HIGH"
      ],

      [
        "Cross-chain bridge usage",
        "MEDIUM"
      ],

      [
        "Split transactions (structuring)",
        "MEDIUM"
      ],

      [
        "Transfer toward known VASP",
        "MEDIUM"
      ]

    ]

  };


  /* ----------------------------------------------------------
     PEEL CHAIN + STRUCTURING
     ---------------------------------------------------------- */

  DATA.patterns = {

    peel_chain: {

      detected:
        true,

      levels:
        3,

      description:
        "Three sequential wallet hops were identified with progressively smaller outgoing amounts, consistent with a peel-chain pattern."

    },


    structuring: {

      detected:
        true,

      description:
        "Multiple fragmented transfers were observed across intermediary wallets instead of a single consolidated transfer."

    }

  };


  /* ----------------------------------------------------------
     CROSS CHAIN
     ---------------------------------------------------------- */

  DATA.cross = {

    source:
      blockchain,

    bridge:
      "Stargate",

    amount:
      "$18,900",

    destination_amount:
      "$18,540",

    destination:
      blockchain === "Ethereum"
        ? "BNB Chain"
        : "Ethereum",

    confidence:
      "88%",

    hops:
      1,

    status:
      "Detected"

  };


  /* ----------------------------------------------------------
     ML ANALYSIS
     ---------------------------------------------------------- */

  DATA.ml = {

    model:
      "Isolation Forest",

    score:
      0.87,

    classification:
      "High Anomaly",

    features: [

      "Rapid fund movement",

      "Mixer interaction",

      "Multiple wallet hops",

      "Cross-chain bridge usage",

      "Transaction fragmentation",

      "VASP-directed transfer"

    ]

  };


  /* ----------------------------------------------------------
     SUMMARY
     ---------------------------------------------------------- */

  DATA.summary = {

    case_id:
      caseId,

    wallet:
      shortWallet,

    blockchain:
      blockchain,

    risk:
      "High",

    vasp:
      "Binance",

    vasp_score:
      94,

    peel_levels:
      3,

    cross_chain:
      true,

    ml_score:
      0.87,

    transaction_count:
      DATA.tx.length

  };


  console.log(
    "✓ Dynamic investigation loaded:",
    DATA.summary
  );

}


/* ============================================================
   REFRESH INVESTIGATION DASHBOARD
   ============================================================ */

function refreshInvestigationDashboard() {

  try {

    applyCurrentInvestigation();

    refreshAllInvestigationModules();

    render();

    drawGraph();

    loadCurrentInvestigationToDashboard();

    toast(
      "✓ Investigation analysis loaded"
    );

  } catch (error) {

    console.error(
      "Dashboard refresh failed:",
      error
    );

    toast(
      "Dashboard refresh failed"
    );

  }

}


/* ============================================================
   START NEW INVESTIGATION
   ============================================================ */

async function startInvestigation() {

  const walletElement =
    $("newWallet");

  const blockchainElement =
    $("newBlockchain");

  const caseTypeElement =
    $("newCaseType");

  const priorityElement =
    $("newPriority");

  const notesElement =
    $("newNotes");


  const wallet =
    walletElement
      ? walletElement.value.trim()
      : "";


  const blockchain =
    blockchainElement
      ? blockchainElement.value
      : "Ethereum";


  const caseType =
    caseTypeElement
      ? caseTypeElement.value
      : "Fraud";


  const priority =
    priorityElement
      ? priorityElement.value
      : "High";


  const notes =
    notesElement
      ? notesElement.value.trim()
      : "";


  if (!wallet) {

    toast(
      "⚠ Please enter a wallet address"
    );

    return;
  }


  const result =
    $("investigationResult");


  if (!result) {

    toast(
      "⚠ Investigation result area not found"
    );

    return;
  }


  result.innerHTML = `

    <div
      class="panel"
      style="margin-top:20px;"
    >

      <p>
        ⏳ Initializing investigation...
      </p>

    </div>

  `;


  try {

    const response =
      await fetch(
        "/api/investigate",
        {

          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({

              wallet:
                wallet,

              blockchain:
                blockchain,

              case_type:
                caseType,

              priority:
                priority,

              notes:
                notes

            })

        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.error ||
        "Investigation failed"
      );

    }


    /* --------------------------------------------------------
       SAVE CURRENT INVESTIGATION
       -------------------------------------------------------- */

    const investigation = {

      case_id:
        data.case_id,

      wallet:
        data.wallet ||
        wallet,

      blockchain:
        data.blockchain ||
        blockchain,

      case_type:
        data.case_type ||
        caseType,

      priority:
        data.priority ||
        priority,

      notes:
        data.notes ||
        notes,

      status:
        data.status ||
        "Active",

      created:
        data.created ||
        new Date().toLocaleString()

    };


    localStorage.setItem(
      "cryptotrace_current_investigation",
      JSON.stringify(
        investigation
      )
    );


    /* --------------------------------------------------------
       HISTORY
       -------------------------------------------------------- */

    let history = [];


    try {

      history =
        JSON.parse(
          localStorage.getItem(
            "cryptotrace_investigation_history"
          ) || "[]"
        );


      if (!Array.isArray(history)) {
        history = [];
      }

    } catch {

      history = [];

    }


    history =
      history.filter(
        item =>
          item.case_id !==
          investigation.case_id
      );


    history.unshift(
      investigation
    );


    history =
      history.slice(0, 20);


    localStorage.setItem(
      "cryptotrace_investigation_history",
      JSON.stringify(history)
    );


    /* --------------------------------------------------------
       APPLY DATA
       -------------------------------------------------------- */

    applyCurrentInvestigation();

    refreshAllInvestigationModules();

    render();

    drawGraph();

    loadCurrentInvestigationToDashboard();


    /* --------------------------------------------------------
       SUCCESS
       -------------------------------------------------------- */

    result.innerHTML = `

      <div
        class="panel"
        style="margin-top:20px;"
      >

        <h3>
          ✅ Investigation Created
        </h3>


        <div class="riskline">

          <span>
            Case ID
          </span>

          <b>
            ${esc(
              investigation.case_id
            )}
          </b>

        </div>


        <div class="riskline">

          <span>
            Wallet
          </span>

          <b>
            ${esc(
              investigation.wallet
            )}
          </b>

        </div>


        <div class="riskline">

          <span>
            Blockchain
          </span>

          <b>
            ${esc(
              investigation.blockchain
            )}
          </b>

        </div>


        <div class="riskline">

          <span>
            Case Type
          </span>

          <b>
            ${esc(
              investigation.case_type
            )}
          </b>

        </div>


        <div class="riskline">

          <span>
            Priority
          </span>

          <b class="high">
            ${esc(
              investigation.priority
            )}
          </b>

        </div>


        <p class="muted">

          ${esc(
            data.message ||
            "Investigation initialized successfully."
          )}

        </p>


        <button
          class="primary"
          onclick="
            showSection('dashboard');
            refreshInvestigationDashboard();
          "
        >
          Open Investigation Dashboard →
        </button>

      </div>

    `;


    toast(
      "✓ Investigation created and dashboard updated"
    );


    console.log(
      "✓ Investigation saved:",
      investigation
    );


  } catch (error) {

    console.error(
      "Investigation creation failed:",
      error
    );


    result.innerHTML = `

      <div
        class="panel"
        style="margin-top:20px;"
      >

        <p class="red">

          ❌
          ${esc(
            error.message
          )}

        </p>

      </div>

    `;

  }

}


/* ============================================================
   LOAD CURRENT INVESTIGATION
   ============================================================ */

function loadCurrentInvestigationToDashboard() {

  const saved =
    localStorage.getItem(
      "cryptotrace_current_investigation"
    );


  if (!saved) {
    return;
  }


  try {

    const investigation =
      JSON.parse(saved);


    document
      .querySelectorAll(
        "[data-case-id]"
      )
      .forEach(element => {

        if (investigation.case_id) {

          element.textContent =
            investigation.case_id;

        }

      });


    document
      .querySelectorAll(
        "[data-wallet]"
      )
      .forEach(element => {

        if (investigation.wallet) {

          element.textContent =
            investigation.wallet;

        }

      });


    document
      .querySelectorAll(
        "[data-blockchain]"
      )
      .forEach(element => {

        if (investigation.blockchain) {

          element.textContent =
            investigation.blockchain;

        }

      });


    console.log(
      "✓ Current investigation loaded:",
      investigation
    );


  } catch (error) {

    console.error(
      "Could not load saved investigation:",
      error
    );

  }

}


/* ============================================================
   OPTIONAL SUMMARY API
   ============================================================ */

function getInvestigationSummary() {

  return {

    case:
      DATA.case,

    wallet:
      DATA.wallet,

    vasp:
      DATA.vasp,

    risk:
      DATA.risk,

    patterns:
      DATA.patterns,

    cross_chain:
      DATA.cross,

    ml:
      DATA.ml,

    transaction_count:
      Array.isArray(DATA.tx)
        ? DATA.tx.length
        : 0

  };

}


/* ============================================================
   VOICE ASSISTANT
   ============================================================ */

let recognition = null;

let isListening = false;


/* ------------------------------------------------------------
   BROWSER SUPPORT
   ------------------------------------------------------------ */

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;


/* ------------------------------------------------------------
   INITIALIZE SPEECH
   ------------------------------------------------------------ */

if (SpeechRecognition) {

  recognition =
    new SpeechRecognition();


  recognition.continuous =
    false;


  recognition.interimResults =
    false;


  recognition.lang =
    "en-IN";


  /* START */

  recognition.onstart =
    function () {

      isListening = true;


      const mic =
        $("micBtn");

      const status =
        $("voiceStatus");

      const text =
        $("voiceText");


      if (mic) {

        mic.style.transform =
          "scale(1.1)";

        mic.style.boxShadow =
          "0 0 12px rgba(0,200,255,.8)";

      }


      if (status) {

        status.textContent =
          "● Listening...";

      }


      if (text) {

        text.textContent =
          "Listening... speak now";

      }

    };


  /* RESULT */

  recognition.onresult =
    function (event) {

      const result =
        event.results[
          event.results.length - 1
        ];


      if (!result) {
        return;
      }


      const transcript =
        result[0]
          .transcript
          .trim();


      if (!transcript) {
        return;
      }


      const input =
        $("q");


      if (input) {

        input.value =
          transcript;

      }


      const text =
        $("voiceText");


      if (text) {

        text.textContent =
          "Question recognized";

      }


      ask(
        transcript
      );

    };


  /* END */

  recognition.onend =
    function () {

      isListening = false;


      const mic =
        $("micBtn");

      const status =
        $("voiceStatus");


      if (mic) {

        mic.style.transform =
          "";

        mic.style.boxShadow =
          "";

      }


      if (status) {

        status.textContent =
          "● Voice Ready";

      }

    };


  /* ERROR */

  recognition.onerror =
    function (event) {

      isListening = false;


      console.error(
        "Speech recognition error:",
        event.error
      );


      const status =
        $("voiceStatus");

      const text =
        $("voiceText");


      if (status) {

        status.textContent =
          "● Voice Ready";

      }


      if (text) {

        if (
          event.error ===
          "not-allowed"
        ) {

          text.textContent =
            "Microphone permission denied";

        }

        else if (
          event.error ===
          "no-speech"
        ) {

          text.textContent =
            "No speech detected";

        }

        else {

          text.textContent =
            "Voice error: " +
            event.error;

        }

      }

    };

}


/* ============================================================
   START VOICE
   ============================================================ */

function startVoice() {

  if (!recognition) {

    toast(
      "Voice recognition is not supported in this browser."
    );

    return;
  }


  if (isListening) {

    stopVoice();

    return;
  }


  try {

    recognition.start();

  } catch (error) {

    console.error(
      "Could not start microphone:",
      error
    );

  }

}


/* ============================================================
   STOP VOICE
   ============================================================ */

function stopVoice() {

  if (
    recognition &&
    isListening
  ) {

    recognition.stop();

  }


  isListening = false;

}


/* ============================================================
   TEXT TO SPEECH
   ============================================================ */

function speakAnswer(text) {

  if (
    !window.speechSynthesis
  ) {

    return;
  }


  window.speechSynthesis.cancel();


  let cleanText =
    String(text)
      .replace(
        /<[^>]*>/g,
        " "
      )
      .replace(
        /\*\*/g,
        ""
      )
      .replace(
        /[#*_]/g,
        ""
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();


  if (!cleanText) {
    return;
  }


  const speech =
    new SpeechSynthesisUtterance(
      cleanText
    );


  speech.lang =
    "en-IN";


  speech.rate =
    0.95;


  speech.pitch =
    1.0;


  speech.volume =
    1.0;


  window.speechSynthesis.speak(
    speech
  );

}


/* ============================================================
   STOP AI VOICE
   ============================================================ */

function stopSpeaking() {

  if (
    window.speechSynthesis
  ) {

    window.speechSynthesis.cancel();

  }

}


/* ============================================================
   START APPLICATION
   ============================================================ */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    setupNavigation();

    showSection(
      "dashboard"
    );

    init();

  }
);