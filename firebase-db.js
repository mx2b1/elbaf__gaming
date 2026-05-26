// Elbaf Gaming - Database & Authentication Operations (English Edition)
// Handles Auth and CRUD operations for both Firestore and LocalStorage (mock mode).

// --- HELPER FUNCTION: Generate Random ID ---
function generateUUID() {
  return 'elbaf-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
}

// --- HELPER FUNCTION: Generate Random Game License Key ---
function generateLicenseKey(pattern) {
  if (!pattern) return "ELBF-KEYS-RAND-OM99-KEYX";
  
  // Custom format generation
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let randomSegment = "";
  for (let i = 0; i < 4; i++) {
    randomSegment += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${pattern.substring(0, 9)}-${randomSegment}-${Date.now().toString(36).substring(4, 8).toUpperCase()}`;
}

// --- MOCK DATABASE HELPER (Local Storage) ---
const mockDb = {
  getUsers: () => JSON.parse(localStorage.getItem('elbaf_users')) || [],
  saveUsers: (users) => localStorage.setItem('elbaf_users', JSON.stringify(users)),
  getOrders: () => JSON.parse(localStorage.getItem('elbaf_orders')) || [],
  saveOrders: (orders) => localStorage.setItem('elbaf_orders', JSON.stringify(orders)),
  
  // Set active session
  setCurrentUser: (user) => localStorage.setItem('elbaf_current_user', JSON.stringify(user)),
  getCurrentUser: () => JSON.parse(localStorage.getItem('elbaf_current_user')) || null,
  clearCurrentUser: () => localStorage.removeItem('elbaf_current_user')
};

// --- DUMMY ORDER SEEDER ---
// Let's seed some beautiful mock orders in English so that the purchases page and admin panel look gorgeous!
if (mockDb.getOrders().length === 0) {
  const seedOrders = [
    {
      orderId: "elbaf-ord-294719",
      userId: "elbaf-mock-user",
      name: "Alex Mercer",
      email: "user@elbaf.com",
      phone: "+12025550143",
      address: "221B Baker St, London, UK",
      items: [
        { id: 1, name: "Red Dead Redemption II", price: 60, quantity: 1, image: "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=800&q=80", licenseKey: "RDR2-MORG-AN99-WILD-WEST-K92B" },
        { id: 10, name: "NARUTO SHIPPUDEN: STORM 4", price: 12, quantity: 1, image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80", licenseKey: "NSTS-NINJ-AWAR-RASN-GANN-L48X" }
      ],
      totalPrice: 72,
      paymentMethod: "Credit Card",
      status: "Shipped",
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toLocaleString('en-US'), // 2 days ago
      timeline: [
        { status: "Pending", time: "Order successfully placed & verified.", active: true },
        { status: "Processing", time: "License pins pulled from digital warehouse.", active: true },
        { status: "Shipped", time: "Digital licenses generated and delivered to vault.", active: true },
        { status: "Completed", time: "Pending confirmation from client.", active: false }
      ]
    },
    {
      orderId: "elbaf-ord-830219",
      userId: "elbaf-mock-user",
      name: "Alex Mercer",
      email: "user@elbaf.com",
      phone: "+12025550143",
      address: "221B Baker St, London, UK",
      items: [
        { id: 11, name: "DRAGON BALL: Sparking! ZERO", price: 64, quantity: 1, image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80", licenseKey: "Pending Processing" }
      ],
      totalPrice: 64,
      paymentMethod: "Cryptocurrency (BTC)",
      status: "Pending",
      date: new Date().toLocaleString('en-US'),
      timeline: [
        { status: "Pending", time: "Payment received on-chain. Order verification in progress.", active: true },
        { status: "Processing", time: "Waiting to pull digital items from database.", active: false },
        { status: "Shipped", time: "License codes delivery.", active: false },
        { status: "Completed", time: "Order completed.", active: false }
      ]
    }
  ];
  mockDb.saveOrders(seedOrders);
}

// =========================================================================
// ========================= AUTHENTICATION OPERATIONS ======================
// =========================================================================

// --- 1. Sign Up ---
function ElbafSignUp(username, name, email, password) {
  return new Promise((resolve, reject) => {
    if (window.useFirebaseMock) {
      setTimeout(() => {
        let users = mockDb.getUsers();
        if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
          reject(new Error("This email is already registered!"));
          return;
        }
        if (users.find(u => u.username && u.username.toLowerCase() === username.toLowerCase())) {
          reject(new Error("This username is already taken!"));
          return;
        }
        
        const newUser = {
          userId: generateUUID(),
          username: username,
          name: name,
          email: email,
          password: password,
          isAdmin: email.toLowerCase() === "admin@elbaf.com"
        };
        
        users.push(newUser);
        mockDb.saveUsers(users);
        
        mockDb.setCurrentUser(newUser);
        resolve(newUser);
      }, 800);
    } else {
      window.firebaseAuth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
          const user = userCredential.user;
          const userData = {
            userId: user.uid,
            username: username,
            name: name,
            email: email,
            isAdmin: email.toLowerCase() === "admin@elbaf.com",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          };
          
          window.firebaseDb.collection("users").doc(user.uid).set(userData)
            .then(() => {
              mockDb.setCurrentUser(userData);
              resolve(userData);
            })
            .catch(err => reject(err));
        })
        .catch(error => {
          let errMsg = error.message;
          if (error.code === 'auth/email-already-in-use') errMsg = "This email is already registered!";
          if (error.code === 'auth/weak-password') errMsg = "Password is too weak! Must be at least 6 characters.";
          reject(new Error(errMsg));
        });
    }
  });
}

// --- 2. Sign In ---
function ElbafLogin(usernameOrEmail, password) {
  return new Promise((resolve, reject) => {
    if (window.useFirebaseMock) {
      setTimeout(() => {
        let users = mockDb.getUsers();
        
        if (users.length === 0) {
          users = [
            { userId: "elbaf-admin-id", username: "admin", name: "Elbaf Admin", email: "admin@elbaf.com", password: "admin", isAdmin: true },
            { userId: "elbaf-mock-user", username: "alex99", name: "Alex Mercer", email: "user@elbaf.com", password: "user", isAdmin: false }
          ];
          mockDb.saveUsers(users);
        }
        
        const matchedUser = users.find(u => 
          (u.email.toLowerCase() === usernameOrEmail.toLowerCase() || 
           (u.username && u.username.toLowerCase() === usernameOrEmail.toLowerCase())) && 
          u.password === password
        );
        
        if (matchedUser) {
          mockDb.setCurrentUser(matchedUser);
          resolve(matchedUser);
        } else {
          reject(new Error("Invalid username/email or password combination!"));
        }
      }, 800);
    } else {
      // If it's an email, login directly with Firebase Auth
      // If it's a username, we first search Firestore to find the email matching that username
      const isEmail = usernameOrEmail.includes("@");
      
      if (isEmail) {
        signInWithFirebaseEmail(usernameOrEmail, password, resolve, reject);
      } else {
        // Query Firestore for username
        window.firebaseDb.collection("users")
          .where("username", "==", usernameOrEmail.toLowerCase())
          .get()
          .then(querySnapshot => {
            if (querySnapshot.empty) {
              reject(new Error("Username not found!"));
            } else {
              let userEmail = "";
              querySnapshot.forEach(doc => {
                userEmail = doc.data().email;
              });
              signInWithFirebaseEmail(userEmail, password, resolve, reject);
            }
          })
          .catch(err => reject(err));
      }
    }
  });
}

// Helper for Firebase email sign in
function signInWithFirebaseEmail(email, password, resolve, reject) {
  window.firebaseAuth.signInWithEmailAndPassword(email, password)
    .then(userCredential => {
      const user = userCredential.user;
      window.firebaseDb.collection("users").doc(user.uid).get()
        .then(doc => {
          if (doc.exists) {
            const userData = doc.data();
            mockDb.setCurrentUser(userData);
            resolve(userData);
          } else {
            const fallbackData = {
              userId: user.uid,
              name: user.displayName || "Elbaf Gamer",
              email: user.email,
              isAdmin: user.email.toLowerCase() === "admin@elbaf.com"
            };
            mockDb.setCurrentUser(fallbackData);
            resolve(fallbackData);
          }
        })
        .catch(err => reject(err));
    })
    .catch(error => {
      let errMsg = error.message;
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errMsg = "Invalid email or password combination!";
      }
      reject(new Error(errMsg));
    });
}

// --- 3. Sign Out ---
function ElbafLogout() {
  return new Promise((resolve, reject) => {
    mockDb.clearCurrentUser();
    if (window.useFirebaseMock) {
      resolve();
    } else {
      window.firebaseAuth.signOut()
        .then(() => resolve())
        .catch(err => reject(err));
    }
  });
}

// --- 4. Get Current Active User ---
function ElbafGetCurrentUser() {
  return mockDb.getCurrentUser();
}

// =========================================================================
// =========================== ORDER OPERATIONS ============================
// =========================================================================

// --- 1. Create Checkout Order ---
function ElbafCreateOrder(customerInfo, cartItems, totalPrice, paymentMethod) {
  return new Promise((resolve, reject) => {
    const currentUser = ElbafGetCurrentUser();
    if (!currentUser) {
      reject(new Error("Please sign in first to complete checkout!"));
      return;
    }

    const orderId = 'elbaf-ord-' + Math.floor(100000 + Math.random() * 900000);
    
    // Add default mock license keys or "Pending Processing" based on initial state
    const processedItems = cartItems.map(item => {
      // Find game metadata in database for licensePattern
      const gameMeta = window.GAMES_DATA ? window.GAMES_DATA.find(g => g.id === item.id) : null;
      const pattern = gameMeta ? gameMeta.licensePattern : "ELBF-KEYS-RAND-OM99-KEYX";
      return {
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
        licenseKey: "Pending Processing" // Will be filled dynamically when shipped or completed
      };
    });

    const newOrder = {
      orderId: orderId,
      userId: currentUser.userId,
      name: customerInfo.name,
      email: currentUser.email,
      phone: customerInfo.phone,
      address: customerInfo.address,
      items: processedItems,
      totalPrice: totalPrice,
      paymentMethod: paymentMethod || "Credit Card",
      status: "Pending",
      date: new Date().toLocaleString('en-US'),
      timeline: [
        { status: "Pending", time: "Order placed securely. Payment processing initiated.", active: true },
        { status: "Processing", time: "Awaiting database pull and license keys release.", active: false },
        { status: "Shipped", time: "Digital game keys generated and sent to vault.", active: false },
        { status: "Completed", time: "Order finalized and verified.", active: false }
      ]
    };

    if (window.useFirebaseMock) {
      setTimeout(() => {
        let orders = mockDb.getOrders();
        orders.unshift(newOrder);
        mockDb.saveOrders(orders);
        resolve(newOrder);
      }, 1000);
    } else {
      window.firebaseDb.collection("orders").doc(orderId).set(newOrder)
        .then(() => {
          resolve(newOrder);
        })
        .catch(err => reject(err));
    }
  });
}

// --- 2. Get User Personal Orders ---
function ElbafGetUserOrders() {
  return new Promise((resolve, reject) => {
    const currentUser = ElbafGetCurrentUser();
    if (!currentUser) {
      resolve([]);
      return;
    }

    if (window.useFirebaseMock) {
      setTimeout(() => {
        const allOrders = mockDb.getOrders();
        const userOrders = allOrders.filter(ord => ord.userId === currentUser.userId);
        resolve(userOrders);
      }, 600);
    } else {
      window.firebaseDb.collection("orders")
        .where("userId", "==", currentUser.userId)
        .get()
        .then(querySnapshot => {
          const userOrders = [];
          querySnapshot.forEach(doc => {
            userOrders.push(doc.data());
          });
          userOrders.sort((a, b) => b.orderId.localeCompare(a.orderId));
          resolve(userOrders);
        })
        .catch(err => reject(err));
    }
  });
}

// --- 3. Get All Store Orders (Admin Dashboard) ---
function ElbafGetAllOrders() {
  return new Promise((resolve, reject) => {
    const currentUser = ElbafGetCurrentUser();
    if (!currentUser || !currentUser.isAdmin) {
      reject(new Error("Access denied! This module is reserved for administrators only."));
      return;
    }

    if (window.useFirebaseMock) {
      setTimeout(() => {
        resolve(mockDb.getOrders());
      }, 500);
    } else {
      window.firebaseDb.collection("orders")
        .get()
        .then(querySnapshot => {
          const allOrders = [];
          querySnapshot.forEach(doc => {
            allOrders.push(doc.data());
          });
          allOrders.sort((a, b) => b.orderId.localeCompare(a.orderId));
          resolve(allOrders);
        })
        .catch(err => reject(err));
    }
  });
}

// --- 4. Update Order Status & Deliver Keys (Admin Dashboard) ---
function ElbafUpdateOrderStatus(orderId, newStatus) {
  return new Promise((resolve, reject) => {
    const currentUser = ElbafGetCurrentUser();
    if (!currentUser || !currentUser.isAdmin) {
      reject(new Error("Access denied! This module is reserved for administrators only."));
      return;
    }

    const timelineTexts = {
      "Pending": "Payment verified. Order in queue.",
      "Processing": "License codes generated and pulled from secure server.",
      "Shipped": "Activation keys successfully delivered to your vault!",
      "Completed": "Transaction completed. Licenses verified by client."
    };

    if (window.useFirebaseMock) {
      setTimeout(() => {
        let orders = mockDb.getOrders();
        const orderIdx = orders.findIndex(ord => ord.orderId === orderId);
        if (orderIdx === -1) {
          reject(new Error("Order not found!"));
          return;
        }

        const currentOrder = orders[orderIdx];
        currentOrder.status = newStatus;
        
        // Dynamic Key generation on processing/shipping!
        if (newStatus === "Shipped" || newStatus === "Completed") {
          currentOrder.items = currentOrder.items.map(item => {
            if (item.licenseKey === "Pending Processing" || item.licenseKey === "") {
              // Find matching pattern in data
              const gameMeta = window.GAMES_DATA ? window.GAMES_DATA.find(g => g.id === item.id) : null;
              const pattern = gameMeta ? gameMeta.licensePattern : "ELBF-KEYS-RAND-OM99";
              item.licenseKey = generateLicenseKey(pattern);
            }
            return item;
          });
        }

        // Timeline progress rendering
        currentOrder.timeline = currentOrder.timeline.map(item => {
          const isCurrent = item.status === newStatus;
          
          let nowActive = false;
          if (newStatus === "Pending") nowActive = item.status === "Pending";
          else if (newStatus === "Processing") nowActive = item.status === "Pending" || item.status === "Processing";
          else if (newStatus === "Shipped") nowActive = item.status === "Pending" || item.status === "Processing" || item.status === "Shipped";
          else if (newStatus === "Completed") nowActive = true;

          return {
            status: item.status,
            time: isCurrent ? `${timelineTexts[item.status]} (${new Date().toLocaleTimeString('en-US')})` : item.time,
            active: nowActive
          };
        });

        orders[orderIdx] = currentOrder;
        mockDb.saveOrders(orders);
        resolve(currentOrder);
      }, 500);
    } else {
      const orderRef = window.firebaseDb.collection("orders").doc(orderId);
      orderRef.get()
        .then(doc => {
          if (!doc.exists) {
            reject(new Error("Order not found!"));
            return;
          }
          const currentOrder = doc.data();
          currentOrder.status = newStatus;
          
          if (newStatus === "Shipped" || newStatus === "Completed") {
            currentOrder.items = currentOrder.items.map(item => {
              if (item.licenseKey === "Pending Processing" || item.licenseKey === "") {
                const gameMeta = window.GAMES_DATA ? window.GAMES_DATA.find(g => g.id === item.id) : null;
                const pattern = gameMeta ? gameMeta.licensePattern : "ELBF-KEYS-RAND-OM99";
                item.licenseKey = generateLicenseKey(pattern);
              }
              return item;
            });
          }

          currentOrder.timeline = currentOrder.timeline.map(item => {
            const isCurrent = item.status === newStatus;
            
            let nowActive = false;
            if (newStatus === "Pending") nowActive = item.status === "Pending";
            else if (newStatus === "Processing") nowActive = item.status === "Pending" || item.status === "Processing";
            else if (newStatus === "Shipped") nowActive = item.status === "Pending" || item.status === "Processing" || item.status === "Shipped";
            else if (newStatus === "Completed") nowActive = true;

            return {
              status: item.status,
              time: isCurrent ? `${timelineTexts[item.status]} (${new Date().toLocaleTimeString('en-US')})` : item.time,
              active: nowActive
            };
          });

          orderRef.update(currentOrder)
            .then(() => resolve(currentOrder))
            .catch(err => reject(err));
        })
        .catch(err => reject(err));
    }
  });
}

// Make functions globally available
window.ElbafSignUp = ElbafSignUp;
window.ElbafLogin = ElbafLogin;
window.ElbafLogout = ElbafLogout;
window.ElbafGetCurrentUser = ElbafGetCurrentUser;
window.ElbafCreateOrder = ElbafCreateOrder;
window.ElbafGetUserOrders = ElbafGetUserOrders;
window.ElbafGetAllOrders = ElbafGetAllOrders;
window.ElbafUpdateOrderStatus = ElbafUpdateOrderStatus;
