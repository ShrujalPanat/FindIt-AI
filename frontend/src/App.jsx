import { useEffect, useState, useRef } from "react";
import "./App.css";

const API_URL = "http://localhost:5000/api/items";
const MATCH_API_URL = "http://localhost:5000/api/matches";
const SHOW_CREATOR_INTRO_ONCE_PER_SESSION = false;

function App() {
  const [showCreatorIntro, setShowCreatorIntro] = useState(
    () =>
      !SHOW_CREATOR_INTRO_ONCE_PER_SESSION ||
      window.sessionStorage.getItem("findit-creator-intro-seen") !== "true"
  );
  const [creatorIntroExiting, setCreatorIntroExiting] = useState(false);
  const [theme, setTheme] = useState(
    () =>
      window.localStorage.getItem("findit-theme") === "dark"
        ? "dark"
        : "light"
  );
  const [activePage, setActivePage] = useState("home");
  const [items, setItems] = useState([]);
  const [browseType, setBrowseType] = useState("lost");
  const [searchText, setSearchText] = useState("");
  const [filteredItems, setFilteredItems] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [matches, setMatches] = useState({});
  const [matchingItemId, setMatchingItemId] = useState(null);
  const [claims, setClaims] = useState([]);
  const [myClaims, setMyClaims] = useState([]);
  const [claimingItemId, setClaimingItemId] = useState(null);
  const scrollObserver = useRef(null);


const [registerForm, setRegisterForm] = useState({
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
});

const [showRegister, setShowRegister] = useState(false);
const [registerErrors, setRegisterErrors] = useState({});
const [registerError, setRegisterError] = useState("");
const [registerSuccess, setRegisterSuccess] = useState(false);
const [registrationLoading, setRegistrationLoading] = useState(false);

const [loginForm, setLoginForm] = useState({
  email: "",
  password: "",
});

const [showLogin, setShowLogin] = useState(false);
const [currentUser, setCurrentUser] = useState(null);

  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    if (!showCreatorIntro) return undefined;

    if (SHOW_CREATOR_INTRO_ONCE_PER_SESSION) {
      window.sessionStorage.setItem("findit-creator-intro-seen", "true");
    }

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const exitDelay = reducedMotion ? 900 : 3000;
    const exitTimer = window.setTimeout(
      () => setCreatorIntroExiting(true),
      exitDelay
    );
    const removeTimer = window.setTimeout(() => {
      setShowCreatorIntro(false);
      setCreatorIntroExiting(false);
    }, exitDelay + (reducedMotion ? 0 : 550));

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(removeTimer);
    };
  }, [showCreatorIntro]);

  useEffect(() => {
    window.localStorage.setItem("findit-theme", theme);
  }, [theme]);

 const [claimForm, setClaimForm] = useState({
  claimant_name: "",
  claimant_contact: "",
  reason: "",
 });

  const [form, setForm] = useState({
    type: "lost",
    name: "",
    category: "",
    description: "",
    location: "",
  });

  // Load items from the backend
  const loadItems = async () => {
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      setItems(data);
    } catch (error) {
      console.error("Could not load items:", error);
    }
  };
  const loadMatches = async (itemId) => {
  if (matchingItemId !== null) return;

  setMatchingItemId(itemId);
  setMatches((previous) => ({
    ...previous,
    [itemId]: undefined,
  }));

  try {
    const response = await fetch(
      `${MATCH_API_URL}/${itemId}`
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Could not load matches:", data);
      return;
    }

    setMatches((previous) => ({
      ...previous,
      [itemId]: data.matches,
    }));
  } catch (error) {
    console.error("Could not load matches:", error);
  } finally {
    setMatchingItemId(null);
  }
};

const loadClaims = async () => {
  try {
    const response = await fetch(
      "http://localhost:5000/api/claims"
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Could not load claims:", data);
      return;
    }

    setClaims(data);
  } catch (error) {
    console.error("Could not load claims:", error);
  }
};

const loadMyClaims = async (studentName) => {
  try {
    const response = await fetch(
      `http://localhost:5000/api/claims/student/${encodeURIComponent(studentName)}`
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Could not load my claims:", data);
      return;
    }

    setMyClaims(data);
  } catch (error) {
    console.error("Could not load my claims:", error);
  }
};

const updateClaimStatus = async (claimId, status) => {
  try {
    const response = await fetch(
      `http://localhost:5000/api/claims/${claimId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: status,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || "Could not update claim.");
      return;
    }

    setClaims((previous) =>
      previous.map((claim) =>
        claim.id === claimId
          ? { ...claim, status: data.status }
          : claim
      )
    );

    alert(`Claim ${status} successfully!`);
  } catch (error) {
    console.error("Could not update claim:", error);
    alert("Could not connect to the backend.");
  }
};

const registerUser = async (event) => {
  event.preventDefault();

  const errors = {};
  const name = registerForm.name.trim();
  const email = registerForm.email.trim();

  if (!name) errors.name = "Enter your full name.";
  if (!email) {
    errors.email = "Enter your email address.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!registerForm.password) errors.password = "Enter a password.";
  if (!registerForm.confirmPassword) {
    errors.confirmPassword = "Confirm your password.";
  } else if (registerForm.password !== registerForm.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  setRegisterErrors(errors);
  setRegisterError("");
  if (Object.keys(errors).length > 0) return;

  setRegistrationLoading(true);
  try {
    const response = await fetch("http://localhost:5000/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        email,
        password: registerForm.password,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      setRegisterError(data.error || "Could not create account.");
      return;
    }

    setRegisterSuccess(true);
  } catch (error) {
    console.error("Could not register user:", error);
    setRegisterError("Could not connect to the backend. Please try again.");
  } finally {
    setRegistrationLoading(false);
  }
};

const openLoginAfterRegistration = () => {
  setLoginForm({
    email: registerForm.email.trim(),
    password: "",
  });
  setShowRegister(false);
  setShowLogin(true);
};

const loginUser = async (event) => {
  event.preventDefault();

  try {
    const response = await fetch(
      "http://localhost:5000/api/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: loginForm.email,
          password: loginForm.password,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || "Could not login.");
      return;
    }

    setCurrentUser(data);

    if (data.role === "student") {
  loadMyClaims(data.name);
}

    setLoginForm({
      email: "",
      password: "",
    });

    setShowLogin(false);

    alert(`Welcome, ${data.name}!`);
  } catch (error) {
    console.error("Could not login:", error);
    alert("Could not connect to the backend.");
  }
};

const submitClaim = async (event) => {
  event.preventDefault();

  try {
    const response = await fetch(
      "http://localhost:5000/api/claims",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          item_id: selectedItem.id,
          claimant_name: claimForm.claimant_name,
          claimant_contact: claimForm.claimant_contact,
          reason: claimForm.reason,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || "Could not submit claim.");
      return;
    }

    alert("Claim submitted successfully!");

    setClaimingItemId(selectedItem.id);
    setSelectedItem(null);

    setClaimForm({
      claimant_name: "",
      claimant_contact: "",
      reason: "",
    });
  } catch (error) {
    console.error("Could not submit claim:", error);
    alert("Could not connect to the backend.");
  }
};
  useEffect(() => {
    loadItems();
    loadClaims();
  }, []);

  useEffect(() => {
  const elements = document.querySelectorAll(".scroll-reveal");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("scroll-visible");
        }
      });
    },
    {
      threshold: 0.12,
    }
  );

  elements.forEach((element) => observer.observe(element));

  return () => observer.disconnect();
}, [activePage, items, filteredItems, browseType]);

  // Handle form changes
  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Submit item to backend
  const handleSubmit = async (event) => {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save item.");
      }

      setMessage("✅ Item reported successfully!");

      setForm({
        type: "lost",
        name: "",
        category: "",
        description: "",
        location: "",
      });

      await loadItems();

      setTimeout(() => {
        setActivePage("browse");
      }, 700);
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`app${activePage === "home" ? " home-active" : ""}${
        theme === "dark" ? " theme-dark" : ""
      }`}
    >
      {showCreatorIntro && (
        <div
          className={`creator-intro${creatorIntroExiting ? " is-exiting" : ""}`}
          role="status"
          aria-live="polite"
        >
          <div className="creator-intro-message">
            <p className="creator-intro-greeting">Hello 👋</p>
            <p className="creator-intro-credit">Made by Shrujal Panat</p>
          </div>
        </div>
      )}

      <header className="navbar">
        <div
          className="logo"
          onClick={() => setActivePage("home")}
        >
          <span className="logo-icon">🔎</span>

          <span>
            FindIt <strong>AI</strong>
          </span>
        </div>

        <nav className="primary-nav">
          <button
            className={activePage === "home" ? "active" : ""}
            onClick={() => setActivePage("home")}
          >
            Home
          </button>

          <button
            className={activePage === "browse" ? "active" : ""}
            onClick={() => {
              setActivePage("browse");
              loadItems();
            }}
          >
            Browse Items
          </button>

          <button
            className={activePage === "report" ? "active" : ""}
            onClick={() => setActivePage("report")}
          >
            Report Item
          </button>

          {currentUser?.role === "student" && (
            <button
              className={activePage === "my-claims" ? "active" : ""}
              onClick={() => {
                setActivePage("my-claims");
                loadMyClaims(currentUser.name);
              }}
            >
              📋 My Claims
            </button>
          )}

          {currentUser?.role === "admin" && (
            <button
              className={activePage === "admin-claims" ? "active" : ""}
              onClick={() => {
                setActivePage("admin-claims");
                loadClaims();
              }}
            >
              🛡️ Admin Claims
            </button>
          )}
        </nav>

        <div className="nav-actions">
          <button
            className="theme-toggle-button"
            type="button"
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            aria-pressed={theme === "dark"}
            onClick={() =>
              setTheme((currentTheme) =>
                currentTheme === "light" ? "dark" : "light"
              )
            }
          >
            {theme === "light" ? "🌙 Dark" : "☀️ Light"}
          </button>

          {!currentUser && (
            <>
              <button
                className="nav-register-button"
                onClick={() => {
                  setRegisterErrors({});
                  setRegisterError("");
                  setRegisterSuccess(false);
                  setShowLogin(false);
                  setShowRegister(true);
                }}
              >
                👤 Register
              </button>

              <button
                className="nav-login-button"
                onClick={() => {
                  setShowRegister(false);
                  setShowLogin(true);
                }}
              >
                🔐 Login
              </button>
            </>
          )}

          {currentUser && (
            <>
              <span className="user-welcome">
                👋 Welcome, {currentUser.name}
              </span>

              <button
                className="nav-login-button"
                onClick={() => {
                  setCurrentUser(null);
                  setActivePage("home");
                }}
              >
                🚪 Logout
              </button>
            </>
          )}
        </div>

      </header>

      <main>
        {/* HOME */}
        {activePage === "home" && (
          <>
            <section className="hero scroll-reveal">
              <div className="hero-content">
                <div className="badge">
                  🤖 FINDIT AI · CAMPUS LOST &amp; FOUND
                </div>

                <h1>
                  Find It.
                  <br />
                  <span>Claim It. Get It Back.</span>
                </h1>

                <p>
                  AI-powered campus lost and found that helps students
                  reconnect with their belongings.
                </p>

                <div className="hero-buttons">
                  <button
                    className="primary-button"
                    onClick={() => {
                      setForm((previous) => ({ ...previous, type: "lost" }));
                      setActivePage("report");
                    }}
                  >
                    Report a Lost Item <span aria-hidden="true">→</span>
                  </button>

                  <button
                    className="secondary-button"
                    onClick={() => {
                      setActivePage("browse");
                      loadItems();
                    }}
                  >
                    Browse Found Items
                  </button>
                </div>
              </div>

              <aside className="home-poster scroll-reveal scroll-right">
                <div className="home-poster-topline">
                  <span>FINDIT AI</span>
                  <span>CAMPUS EDITION</span>
                </div>

                <div className="home-poster-art" aria-hidden="true">
                  <span className="poster-orbit poster-orbit-outer" />
                  <span className="poster-orbit poster-orbit-inner" />
                  <span className="poster-item-icon">🎒</span>
                  <span className="poster-search-icon">🔎</span>
                  <span className="poster-decoration poster-decoration-match">
                    MATCH FOUND
                  </span>
                  <span className="poster-decoration poster-decoration-campus">
                    CAMPUS
                  </span>
                </div>

                <div className="home-poster-copy">
                  <span>LOST &amp; FOUND, REIMAGINED</span>
                  <h2>Every item has a way home.</h2>
                  <p>
                    Report it, explore found items, and help bring your campus
                    community together.
                  </p>
                </div>

                <button
                  className="home-poster-button"
                  onClick={() => {
                    setActivePage("browse");
                    loadItems();
                  }}
                >
                  Explore found items <span aria-hidden="true">→</span>
                </button>

                <div className="home-poster-shortcuts">
                  <button
                    className="poster-shortcut-button"
                    onClick={() => {
                      setForm((previous) => ({ ...previous, type: "lost" }));
                      setActivePage("report");
                    }}
                  >
                    <span aria-hidden="true">🔴</span>
                    Report lost
                  </button>
                  <button
                    className="poster-shortcut-button"
                    onClick={() => {
                      setForm((previous) => ({ ...previous, type: "found" }));
                      setActivePage("report");
                    }}
                  >
                    <span aria-hidden="true">🟢</span>
                    Report found
                  </button>
                </div>

                {currentUser?.role === "student" && (
                  <button
                    className="poster-account-button"
                    onClick={() => {
                      setActivePage("my-claims");
                      loadMyClaims(currentUser.name);
                    }}
                  >
                    📋 View my claims
                  </button>
                )}

                {currentUser?.role === "admin" && (
                  <button
                    className="poster-account-button"
                    onClick={() => {
                      setActivePage("admin-claims");
                      loadClaims();
                    }}
                  >
                    🛡️ Review claims
                  </button>
                )}
              </aside>
            </section>

            <section className="how-it-works-section">
              <div className="how-it-works-heading scroll-reveal">
                <span className="how-it-works-eyebrow">SIMPLE AS 1, 2, 3</span>
                <h2>How It Works</h2>
                <p>Three simple steps to help bring your belongings home.</p>
              </div>

              <div className="how-it-works-grid">
                <article className="how-it-works-card scroll-reveal">
                  <span className="how-it-works-number">01</span>
                  <span className="how-it-works-icon" aria-hidden="true">📦</span>
                  <h3>Report</h3>
                  <p>Share the details of an item you lost or found on campus.</p>
                </article>

                <article className="how-it-works-card scroll-reveal">
                  <span className="how-it-works-number">02</span>
                  <span className="how-it-works-icon" aria-hidden="true">🤖</span>
                  <h3>Match</h3>
                  <p>Explore possible matches with help from AI-powered suggestions.</p>
                </article>

                <article className="how-it-works-card scroll-reveal">
                  <span className="how-it-works-number">03</span>
                  <span className="how-it-works-icon" aria-hidden="true">🎉</span>
                  <h3>Reunite</h3>
                  <p>Connect with the right person and get the item back where it belongs.</p>
                </article>
              </div>
            </section>

            <section className="why-findit-section">
              <div className="why-findit-content scroll-reveal">
                <span className="why-findit-eyebrow">MADE FOR CAMPUS LIFE</span>
                <h2>Why FindIt AI?</h2>
                <p className="why-findit-intro">
                  A simpler, smarter way for our campus community to look out
                  for one another.
                </p>

                <div className="why-findit-grid">
                  <article className="why-findit-card scroll-reveal">
                    <span className="why-findit-icon" aria-hidden="true">🏫</span>
                    <h3>Made for your campus</h3>
                    <p>
                      Keep lost and found reports focused on the places and
                      people you know.
                    </p>
                  </article>

                  <article className="why-findit-card scroll-reveal">
                    <span className="why-findit-icon" aria-hidden="true">✨</span>
                    <h3>Smarter discovery</h3>
                    <p>
                      AI match suggestions help surface reports that may be
                      relevant to what you lost.
                    </p>
                  </article>

                  <article className="why-findit-card scroll-reveal">
                    <span className="why-findit-icon" aria-hidden="true">🤝</span>
                    <h3>Community-powered</h3>
                    <p>
                      Make it easier for students to share useful details and
                      return items to their owners.
                    </p>
                  </article>
                </div>
              </div>
            </section>
          </>
        )}
          

        {/* BROWSE */}
        {activePage === "browse" && (
          <section className="page-section browse-page scroll-reveal">
            <div className="badge">
              CAMPUS ITEMS
            </div>

            <h1>Browse Items</h1>
            <p className="page-description">
              Search campus reports and explore lost and found items.
            </p>

            <div className="search-box">
              <span className="search-box-icon" aria-hidden="true">⌕</span>
              <input
                className="search-box-input"
                type="search"
                aria-label="Search reported items"
                value={searchText}
                onChange={(event) => {
                  setSearchText(event.target.value);
                  setFilteredItems(null);
                }}
                placeholder="Search by item, category, or location..."
              />
              <button
                className="search-box-button"
                type="button"
                onClick={() => {
                  const query = searchText.trim().toLowerCase();

                  if (!query) return;

                  const filteredItems = items.filter((item) => {
                    const text = [
                      item.name,
                      item.category,
                      item.description,
                      item.location,
                    ]
                      .join(" ")
                      .toLowerCase();

                    return text.includes(query);
                  });

                  setFilteredItems(filteredItems);
                }}
              >
                <span aria-hidden="true">✦</span>
                <span>AI Search</span>
              </button>
            </div>

            <div className="browse-view-controls" role="group" aria-label="Choose item type to browse">
              <button
                className={`browse-toggle-lost${browseType === "lost" ? " active" : ""}`}
                aria-pressed={browseType === "lost"}
                onClick={() => setBrowseType("lost")}
              >
                🔴 Lost Items
              </button>
              <button
                className={`browse-toggle-found${browseType === "found" ? " active" : ""}`}
                aria-pressed={browseType === "found"}
                onClick={() => setBrowseType("found")}
              >
                🟢 Found Items
              </button>
              <button
                className={`browse-toggle-all${browseType === "all" ? " active" : ""}`}
                aria-pressed={browseType === "all"}
                onClick={() => setBrowseType("all")}
              >
                See All
              </button>
            </div>

            {(browseType === "all" ? ["lost", "found"] : [browseType]).map((type) => {
              const sectionItems = (filteredItems ?? items).filter(
                (item) => item.type === type
              );
              const isLostSection = type === "lost";

              return (
                <section className={`browse-item-section ${type}-items-section`} key={type}>
                  <div className="browse-item-section-header">
                    <div>
                      <span className={`browse-section-icon ${type}-section-icon`} aria-hidden="true">
                        {isLostSection ? "🔴" : "🟢"}
                      </span>
                      <div>
                        <h2>{isLostSection ? "Lost Items" : "Found Items"}</h2>
                        <p>
                          {isLostSection
                            ? "Items reported missing by students."
                            : "Items found around campus."}
                        </p>
                      </div>
                    </div>
                    <span className={`browse-item-count ${type}-item-count`}>
                      {sectionItems.length} {sectionItems.length === 1 ? "item" : "items"}
                    </span>
                  </div>

                  {sectionItems.length === 0 ? (
                    <div className="browse-section-empty">
                      <span aria-hidden="true">{isLostSection ? "🔎" : "📦"}</span>
                      <div>
                        <h3>
                          {filteredItems !== null
                            ? "No matching items in this section"
                            : isLostSection
                              ? "No lost items found"
                              : "No found items yet"}
                        </h3>
                        <p>
                          {filteredItems !== null
                            ? "Try another search or explore the other section."
                            : isLostSection
                              ? "Try reporting a lost item or adjusting your search."
                              : "Found something? Report it so the owner can find it."}
                        </p>
                      </div>
                      {filteredItems === null && (
                        <button
                          className="browse-section-report-button"
                          onClick={() => {
                            setForm((previous) => ({ ...previous, type }));
                            setActivePage("report");
                          }}
                        >
                          Report {type} item <span aria-hidden="true">→</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="items-grid">
                {sectionItems.map((item) => (
                  <div
                    className="claim-card-wrapper scroll-stagger"
                    key={item.id}
                  >
                    <div
                      className={`claim-card-inner ${
                        item.type === "found" &&
                        selectedItem?.id === item.id
                          ? "flipped"
                          : ""
                      }`}
                    >
                      <div
                        className={`claim-card-front item-card ${
                          item.type === "lost" ? "lost" : "found"
                        }`}
                      >

                    <div className="item-top">
                      <span
                        className={
                          item.type === "lost"
                            ? "lost-tag"
                            : "found-tag"
                        }
                      >
                        {item.type === "lost"
                          ? "🔴 LOST"
                          : "🟢 FOUND"}
                      </span>

                      <span className="item-category">
                        {item.category}
                      </span>
                    </div>

                    <h2>{item.name}</h2>

                    <p>{item.description}</p>

                    <div className="item-location">
                      📍 {item.location}
                    </div>

                    <small>
                      Report #{item.id}
                    </small>

                    {item.type === "lost" && (
                      <div className="ai-match-section">
                        <button
                          className="ai-match-button"
                          disabled={matchingItemId !== null}
                          onClick={() => loadMatches(item.id)}
                        >
                          {matchingItemId === item.id
                            ? "🤖 Matching..."
                            : "🤖 Find AI Matches"}
                        </button>

                        {matches[item.id] &&
                          matches[item.id].length > 0 && (
                            <div className="match-results">
                              <h3 className="ai-thinking">
                                🤖 AI Match Suggestions
                              </h3>

                              {matches[item.id].map((match) => (
                                <div className="match-card" key={match.id}>
                                  <div>
                                    <strong>{match.name}</strong>
                                    <p>📍 {match.location}</p>
                                    <span>🏷️ {match.category}</span>
                                  </div>

                                  <div className="match-score">
                                    {match.matchScore}% Match
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                        {matches[item.id] &&
                          matches[item.id].length === 0 && (
                            <p className="no-match">
                              No possible matches found yet.
                            </p>
                          )}
                      </div>
                    )}

{item.type === "found" && (
  <div className="claim-section">
    {claimingItemId === item.id ? (
      <p className="claim-status" role="status">
        ⏳ Claim Pending / submitted
      </p>
    ) : (
      <button
        className="claim-button"
        onClick={() => {
          setSelectedItem(item);
          setClaimForm({
            claimant_name: "",
            claimant_contact: "",
            reason: "",
          });
        }}
      >
        📋 Claim This Item
      </button>
    )}
  </div>
)}

                      </div>

                      {item.type === "found" &&
                        selectedItem?.id === item.id && (
                          <div className="claim-card-back item-card found">
                            <form
                              className="claim-form"
                              onSubmit={submitClaim}
                            >
                              <h2>Claim {item.name}</h2>

                              <label htmlFor={`claimant-name-${item.id}`}>
                                Name
                                <input
                                  id={`claimant-name-${item.id}`}
                                  name="claimant_name"
                                  value={claimForm.claimant_name}
                                  onChange={(event) =>
                                    setClaimForm({
                                      ...claimForm,
                                      claimant_name: event.target.value,
                                    })
                                  }
                                  required
                                />
                              </label>

                              <label htmlFor={`claimant-contact-${item.id}`}>
                                Contact
                                <input
                                  id={`claimant-contact-${item.id}`}
                                  name="claimant_contact"
                                  value={claimForm.claimant_contact}
                                  onChange={(event) =>
                                    setClaimForm({
                                      ...claimForm,
                                      claimant_contact: event.target.value,
                                    })
                                  }
                                  required
                                />
                              </label>

                              <label htmlFor={`claim-reason-${item.id}`}>
                                Reason for claiming
                                <textarea
                                  id={`claim-reason-${item.id}`}
                                  name="reason"
                                  value={claimForm.reason}
                                  onChange={(event) =>
                                    setClaimForm({
                                      ...claimForm,
                                      reason: event.target.value,
                                    })
                                  }
                                  required
                                />
                              </label>

                              <div className="claim-form-actions">
                                <button
                                  type="button"
                                  onClick={() => setSelectedItem(null)}
                                >
                                  Cancel
                                </button>
                                <button type="submit">Submit Claim</button>
                              </div>
                            </form>
                          </div>
                        )}
                    </div>
                  </div>
                ))}
                    </div>
                  )}
                </section>
              );
            })}
          </section>
        )}

        {/* REPORT */}
        {activePage === "report" && (
          <section className="page-section report-page scroll-reveal">
            <div className="badge">
              REPORT
            </div>

            <h1>
              Report a Lost or Found Item
            </h1>

            <p className="page-description">
              Provide the details below so FindIt AI can
              help connect lost items with their owners.
            </p>

            <form
              className="report-card"
              onSubmit={handleSubmit}
            >
              <label>Item Type</label>

              <div className="type-buttons">
                <button
                  type="button"
                  className={
                    form.type === "lost"
                      ? "selected-type"
                      : ""
                  }
                  onClick={() =>
                    setForm({
                      ...form,
                      type: "lost",
                    })
                  }
                >
                  🔴 Lost Item
                </button>

                <button
                  type="button"
                  className={
                    form.type === "found"
                      ? "selected-type"
                      : ""
                  }
                  onClick={() =>
                    setForm({
                      ...form,
                      type: "found",
                    })
                  }
                >
                  🟢 Found Item
                </button>
              </div>

              <label htmlFor="name">
                Item Name
              </label>

              <input
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Black backpack"
                required
              />

              <label htmlFor="category">
                Category
              </label>

              <select
                id="category"
                name="category"
                value={form.category}
                onChange={handleChange}
                required
              >
                <option value="">
                  Select category
                </option>

                <option value="Electronics">
                  Electronics
                </option>

                <option value="Books">
                  Books
                </option>

                <option value="Accessories">
                  Accessories
                </option>

                <option value="Documents">
                  Documents
                </option>

                <option value="Bags">
                  Bags
                </option>

                <option value="Other">
                  Other
                </option>
              </select>

              <label htmlFor="description">
                Description
              </label>

              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Describe the item, colour, identifying features..."
                rows="4"
                required
              />

              <label htmlFor="location">
                Location
              </label>

              <input
                id="location"
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="e.g. Library, Block A"
                required
              />

              {message && (
                <div className="form-message">
                  {message}
                </div>
              )}

              <button
                type="submit"
                className="primary-button submit-button"
                disabled={loading}
              >
                {loading
                  ? "Saving..."
                  : "Submit Report"}
              </button>
            </form>
          </section>
        )}
       

{currentUser?.role === "student" && activePage === "my-claims" && (
  <div className="my-claims-section" id="my-claims">
    <div className="my-claims-header">
      <h2>📋 My Claims</h2>
      <p>Track the claims you have submitted and their verification status.</p>
    </div>

    {myClaims.length === 0 ? (
      <div className="my-claims-empty">
        <div className="my-claims-empty-icon" aria-hidden="true">📋</div>
        <h3>No claims yet</h3>
        <p>You haven't submitted any item claims yet.</p>
        <button
          className="primary-button"
          onClick={() => {
            setActivePage("browse");
            loadItems();
          }}
        >
          Browse Found Items
        </button>
      </div>
    ) : (
      <div className="claims-list">
        {myClaims.map((claim) => {
          const status = claim.status?.toLowerCase();
          const statusLabels = {
            pending: "🟡 Pending",
            approved: "🟢 Approved",
            rejected: "🔴 Rejected",
          };

          return (
            <div className="my-claim-card" key={claim.id}>
              <div className="my-claim-card-header">
                <h3>📦 {claim.item_name}</h3>
                <span className={`my-claim-status status-${status || "unknown"}`}>
                  {statusLabels[status] || claim.status}
                </span>
              </div>

              <p>
                <strong>📍 Location:</strong> {claim.location}
              </p>

              <p>
                <strong>📝 Reason:</strong> {claim.reason}
              </p>
            </div>
          );
        })}
      </div>
    )}
  </div>
)}

{currentUser?.role === "admin" && activePage === "admin-claims" && (
  <section className="admin-claims-section admin-claims-page" id="admin-claims">
    <div className="admin-claims-header">
      <div>
        <span className="admin-page-eyebrow">ADMIN WORKSPACE</span>
        <h1>🛡️ Manage Claims</h1>
        <p>Review submissions, verify claim details, and update claim status.</p>
      </div>
      <button
        className="admin-claims-refresh"
        onClick={loadClaims}
      >
        ↻ Refresh claims
      </button>
    </div>

    <div className="admin-claims-summary" aria-label="Claim summary">
      <div>
        <span>Total claims</span>
        <strong>{claims.length}</strong>
      </div>
      <div>
        <span>Pending review</span>
        <strong>{claims.filter((claim) => claim.status?.toLowerCase() === "pending").length}</strong>
      </div>
    </div>

    {claims.length === 0 ? (
      <div className="admin-claims-empty">
        <h3>No claims to review</h3>
        <p>There are currently no submitted claims.</p>
      </div>
    ) : (
      <div className="claims-list">
        {claims.map((claim) => {
          const status = claim.status?.toLowerCase();
          const statusLabels = {
            pending: "🟡 Pending",
            approved: "🟢 Approved",
            rejected: "🔴 Rejected",
            returned: "📦 Returned",
          };

          return (
            <div className="admin-claim-card" key={claim.id}>
              <div className="admin-claim-card-header">
                <h3>📦 {claim.item_name}</h3>
                <span className={`admin-claim-status status-${status || "unknown"}`}>
                  {statusLabels[status] || claim.status}
                </span>
              </div>

              <p><strong>📍 Location:</strong> {claim.location}</p>
              <p><strong>Claimant:</strong> {claim.claimant_name}</p>
              <p><strong>Contact:</strong> {claim.claimant_contact}</p>
              <p><strong>📝 Reason:</strong> {claim.reason}</p>

              {status === "pending" && (
                <div className="claim-admin-actions">
                  <button
                    className="approve-claim-button"
                    onClick={() => updateClaimStatus(claim.id, "approved")}
                  >
                    ✅ Approve
                  </button>
                  <button
                    className="reject-claim-button"
                    onClick={() => updateClaimStatus(claim.id, "rejected")}
                  >
                    ❌ Reject
                  </button>
                </div>
              )}

              {status === "approved" && (
                <div className="claim-admin-actions">
                  <button
                    className="return-claim-button"
                    onClick={() => updateClaimStatus(claim.id, "returned")}
                  >
                    📦 Mark Returned
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    )}
  </section>
)}
{showRegister && (
  <div className="register-form-container" role="dialog" aria-modal="true" aria-labelledby="register-title">
    <div className="register-form">
      {registerSuccess ? (
        <div className="register-success-state" role="status">
          <span className="register-success-icon" aria-hidden="true">✓</span>
          <h2 id="register-title">Account created successfully!</h2>
          <p>Your FindIt AI account is ready. Log in to continue.</p>
          <button
            className="register-submit-button"
            type="button"
            onClick={openLoginAfterRegistration}
          >
            Go to Login
          </button>
        </div>
      ) : (
        <>
          <h2 id="register-title">Create your FindIt AI account</h2>
          <p className="auth-subtitle">Join your campus lost &amp; found community</p>

          <form onSubmit={registerUser} noValidate>
            <label>
              Full Name
              <input
                type="text"
                autoComplete="name"
                required
                value={registerForm.name}
                aria-invalid={Boolean(registerErrors.name)}
                aria-describedby={registerErrors.name ? "register-name-error" : undefined}
                onChange={(event) => {
                  setRegisterForm({ ...registerForm, name: event.target.value });
                  setRegisterErrors({ ...registerErrors, name: "" });
                  setRegisterError("");
                }}
                placeholder="Enter your full name"
              />
              {registerErrors.name && (
                <span className="auth-field-error" id="register-name-error" role="alert">
                  {registerErrors.name}
                </span>
              )}
            </label>

            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                required
                value={registerForm.email}
                aria-invalid={Boolean(registerErrors.email)}
                aria-describedby={registerErrors.email ? "register-email-error" : undefined}
                onChange={(event) => {
                  setRegisterForm({ ...registerForm, email: event.target.value });
                  setRegisterErrors({ ...registerErrors, email: "" });
                  setRegisterError("");
                }}
                placeholder="Enter your email"
              />
              {registerErrors.email && (
                <span className="auth-field-error" id="register-email-error" role="alert">
                  {registerErrors.email}
                </span>
              )}
            </label>

            <label>
              Password
              <input
                type="password"
                autoComplete="new-password"
                required
                value={registerForm.password}
                aria-invalid={Boolean(registerErrors.password)}
                aria-describedby={registerErrors.password ? "register-password-error" : undefined}
                onChange={(event) => {
                  setRegisterForm({ ...registerForm, password: event.target.value });
                  setRegisterErrors({ ...registerErrors, password: "" });
                  setRegisterError("");
                }}
                placeholder="Create a password"
              />
              {registerErrors.password && (
                <span className="auth-field-error" id="register-password-error" role="alert">
                  {registerErrors.password}
                </span>
              )}
            </label>

            <label>
              Confirm Password
              <input
                type="password"
                autoComplete="new-password"
                required
                value={registerForm.confirmPassword}
                aria-invalid={Boolean(registerErrors.confirmPassword)}
                aria-describedby={registerErrors.confirmPassword ? "register-confirm-password-error" : undefined}
                onChange={(event) => {
                  setRegisterForm({ ...registerForm, confirmPassword: event.target.value });
                  setRegisterErrors({ ...registerErrors, confirmPassword: "" });
                  setRegisterError("");
                }}
                placeholder="Re-enter your password"
              />
              {registerErrors.confirmPassword && (
                <span className="auth-field-error" id="register-confirm-password-error" role="alert">
                  {registerErrors.confirmPassword}
                </span>
              )}
            </label>

            {registerError && (
              <p className="auth-form-error" role="alert">{registerError}</p>
            )}

            <div className="register-form-actions">
              <button
                className="register-submit-button"
                type="submit"
                disabled={registrationLoading}
              >
                {registrationLoading ? "Creating account..." : "Create Account"}
              </button>
              <button
                className="register-cancel-button"
                type="button"
                onClick={() => setShowRegister(false)}
                disabled={registrationLoading}
              >
                Cancel
              </button>
            </div>
          </form>

          <p className="auth-switch-prompt">
            Already have an account?{" "}
            <button type="button" onClick={() => {
              setShowRegister(false);
              setShowLogin(true);
            }}>
              Login
            </button>
          </p>
        </>
      )}
    </div>
  </div>
)}

{showLogin && (
  <div className="login-form-container" role="dialog" aria-modal="true" aria-labelledby="login-title">
    <div className="login-form">
      <h2 id="login-title">🔐 Student Login</h2>

      <form onSubmit={loginUser}>
        <label>
          Email
          <input
            type="email"
            value={loginForm.email}
            onChange={(event) =>
              setLoginForm({
                ...loginForm,
                email: event.target.value,
              })
            }
            placeholder="Enter your email"
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={loginForm.password}
            onChange={(event) =>
              setLoginForm({
                ...loginForm,
                password: event.target.value,
              })
            }
            placeholder="Enter your password"
            required
          />
        </label>

        <div className="login-form-actions">
          <button type="submit">
            Login
          </button>

          <button
            type="button"
            onClick={() => setShowLogin(false)}
          >
            Cancel
          </button>
        </div>
      </form>
      <p className="auth-switch-prompt">
        Don&apos;t have an account?{" "}
        <button type="button" onClick={() => {
          setShowLogin(false);
          setRegisterErrors({});
          setRegisterError("");
          setRegisterSuccess(false);
          setShowRegister(true);
        }}>
          Register
        </button>
      </p>
    </div>
  </div>
)}

      </main>

      <footer className="creator-credit-footer">
        Made by Shrujal Panat
      </footer>
    </div>
  );
}

export default App;