import Header from "./Header";
import { NavLink, useLocation, useNavigate } from "react-router";
import { useEffect, useRef, useState } from "react";
import { fetchHomeStats, loginUser, requestPhoneOtp, verifyPhoneOtp } from "../utils/api";
import { saveSession } from "../utils/session";
import { useToast } from "./ui/ToastProvider";

const ABOUT_SECTIONS = ["value", "mission", "vision"];

const Home = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isopen, setisopen] = useState(false);
    const [isphone, setisphone] = useState(false);
    const [activeAbout, setActiveAbout] = useState("value");
    const isvalue = activeAbout === "value";
    const ismission = activeAbout === "mission";
    const isvision = activeAbout === "vision";
    const [otp, setotp] = useState(["", "", "", "", "", ""]);
    const [phoneNumber, setPhoneNumber] = useState("");
    const [phoneLoginError, setPhoneLoginError] = useState("");
    const [otpHint, setOtpHint] = useState("");
    const [loginEmail, setloginEmail] = useState("");
    const [loginPassword, setloginPassword] = useState("");
    const [authNotice, setauthNotice] = useState("");
    const [loginError, setloginError] = useState("");
    const [stats, setStats] = useState({
        totalReports: 0,
        resolvedReports: 0,
        activeUsers: 0,
    });
    const [displayStats, setDisplayStats] = useState({
        totalReports: 0,
        resolvedReports: 0,
        activeUsers: 0,
    });
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const inputrefer = useRef([]);
    const toast = useToast();

    const handleotp = (e, index) => {
        const otps = e.target.value;
        if (isNaN(otps)) {
            return;
        }

        const newotp = [...otp];
        newotp[index] = otps;
        setotp(newotp);

        if (otps && index < otp.length - 1) {
            inputrefer.current[index + 1].focus();
        }
    };

    const handlekey = (e, index) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputrefer.current[index - 1].focus();
        }
    };

    const completeLogin = ({ token, user }) => {
        saveSession({ token, user });
        setisopen(false);
        setisphone(false);
        setauthNotice("");
        setloginError("");
        setPhoneLoginError("");
        setPhoneNumber("");
        setotp(["", "", "", "", "", ""]);
        setOtpHint("");

        if (location.state?.redirectTo) {
            navigate(location.state.redirectTo, { replace: true });
        }
    };

    const handleUserLogin = async (e) => {
        e.preventDefault();
        setloginError("");
        setIsLoggingIn(true);
        try {
            const response = await loginUser({
                email: loginEmail.trim().toLowerCase(),
                password: loginPassword,
            });
            toast.success("Login successful.");
            completeLogin(response);
        } catch (error) {
            const message = error.message || "Unable to login.";
            setloginError(message);
            toast.error(message);
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handlesubmit = (e) => {
        e.preventDefault();
        const verify = async () => {
            const enteredOtp = otp.join("").trim();
            if (!phoneNumber.trim()) {
                setPhoneLoginError("Enter your registered phone number.");
                return;
            }
            if (enteredOtp.length !== 6) {
                setPhoneLoginError("Enter the 6-digit OTP.");
                return;
            }

            try {
                setIsVerifyingOtp(true);
                setPhoneLoginError("");
                const response = await verifyPhoneOtp({
                    phone: phoneNumber,
                    otp: enteredOtp,
                });
                toast.success("Phone login successful.");
                completeLogin(response);
            } catch (error) {
                const message = error.message || "Unable to verify OTP.";
                setPhoneLoginError(message);
                toast.error(message);
            } finally {
                setIsVerifyingOtp(false);
            }
        };

        verify();
    };

    const handlephonelogin = () => {
        setisphone(true);
        setisopen(false);
        setPhoneLoginError("");
    };

    const handleclose = () => {
        setisopen(!isopen);
    };

    const handleclosephone = () => {
        setisphone(!isphone);
    };

    const handleSendOtp = async () => {
        if (!phoneNumber.trim()) {
            setPhoneLoginError("Enter your registered phone number.");
            return;
        }

        try {
            setIsSendingOtp(true);
            setPhoneLoginError("");
            const response = await requestPhoneOtp({ phone: phoneNumber });
            setOtpHint(response.otp ? `Demo OTP: ${response.otp}` : "OTP sent to your phone.");
            toast.success(response.message || "OTP sent successfully.");
            inputrefer.current[0]?.focus();
        } catch (error) {
            const message = error.message || "Unable to send OTP.";
            setPhoneLoginError(message);
            toast.error(message);
        } finally {
            setIsSendingOtp(false);
        }
    };

    const handlevalue = () => {
        setActiveAbout((current) => current === "value" ? "" : "value");
    };

    const handlevision = () => {
        setActiveAbout((current) => current === "vision" ? "" : "vision");
    };

    const handlemisson = () => {
        setActiveAbout((current) => current === "mission" ? "" : "mission");
    };

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            setActiveAbout((current) => {
                const currentIndex = ABOUT_SECTIONS.indexOf(current);
                return ABOUT_SECTIONS[(currentIndex + 1) % ABOUT_SECTIONS.length];
            });
        }, 3000);

        return () => window.clearInterval(intervalId);
    }, []);

    useEffect(() => {
        if (location.state?.loginRequired) {
            setauthNotice(location.state.message || "Please login first to access this page.");
            setisopen(true);
            navigate("/", { replace: true, state: {} });
            return;
        }

        if (location.state?.showLogin) {
            setauthNotice(location.state.message || "Please login with your registered credentials.");
            setisopen(true);
            navigate("/", { replace: true, state: {} });
            return;
        }

        if (location.state?.message) {
            setauthNotice(location.state.message);
            navigate("/", { replace: true, state: {} });
        }
    }, [location.state, navigate]);

    useEffect(() => {
        const loadStats = async () => {
            try {
                setStats(await fetchHomeStats());
            } catch {
                setStats({
                    totalReports: 0,
                    resolvedReports: 0,
                    activeUsers: 0,
                });
            }
        };

        loadStats();
        window.addEventListener("eco-reports-changed", loadStats);
        window.addEventListener("eco-auth-changed", loadStats);

        return () => {
            window.removeEventListener("eco-reports-changed", loadStats);
            window.removeEventListener("eco-auth-changed", loadStats);
        };
    }, []);

    useEffect(() => {
        const duration = 700;
        const start = performance.now();
        const initialStats = { ...displayStats };

        let frameId;
        const tick = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);

            setDisplayStats({
                totalReports: Math.round(initialStats.totalReports + (stats.totalReports - initialStats.totalReports) * eased),
                resolvedReports: Math.round(initialStats.resolvedReports + (stats.resolvedReports - initialStats.resolvedReports) * eased),
                activeUsers: Math.round(initialStats.activeUsers + (stats.activeUsers - initialStats.activeUsers) * eased),
            });

            if (progress < 1) {
                frameId = window.requestAnimationFrame(tick);
            }
        };

        frameId = window.requestAnimationFrame(tick);
        return () => window.cancelAnimationFrame(frameId);
    }, [stats]);

    return (
        <>
            <Header
                setisopen={setisopen}
            />
            <div className={`Home ${(isopen || isphone) ? "blur" : ""} `} id="home">
                <div className="home-shell">
                    <section className="home-hero">
                        <div className="home-brand">
                            <img src="/logo-removebg-preview.png" alt="Campus Maintenance Portal Logo" />
                            <div className="home-copy">
                                <h1>Campus Maintenance Portal</h1>
                                <p>~A smart platform for campus environmental issue tracking.</p>
                                {authNotice ? <p className="auth-alert">{authNotice}</p> : null}
                                <div className="home-divider" />

                                <div className="home-btn">
                                    <span className="btn btn-primary"><NavLink to="/reportissue" style={{ textDecoration: "none", color: "white" }}><b>Report an Issue</b></NavLink></span>
                                    <span className="btn btn-secondary"><NavLink to="/checkstatus" style={{ textDecoration: "none", color: "#163a63" }}><b>Check Status</b></NavLink></span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="detail-box">
                        <div className="box box-raised">
                            <div className="box-content">
                                <img src="/compliant-raised.png" alt="Complaint-raised" />
                                <div className="box-metric">
                                    <h1>{displayStats.totalReports}</h1>
                                    <p>Complaints Raised</p>
                                </div>
                            </div>
                        </div>
                        <div className="box box-resolved">
                            <div className="box-content">
                                <img src="/compliantsolved.jpg" alt="complaint-resolved" />
                                <div className="box-metric">
                                    <h1>{displayStats.resolvedReports}</h1>
                                    <p>Complaints Resolved</p>
                                </div>
                            </div>
                        </div>
                        <div className="box box-users">
                            <div className="box-content">
                                <img src="/active users.jpg" alt="Active-user" className="comp-img" />
                                <div className="box-metric">
                                    <h1>{displayStats.activeUsers}</h1>
                                    <p>Active Users</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`phone-logs ${isphone ? "show" : ""}`}>
                <div className="login-phonenumber">
                    <button className="close-btn" onClick={handleclosephone}>x</button>
                    <h1>Login</h1>
                    <div className="phonenumber">
                        <label>Phone Number</label>
                        <input type="tel" placeholder="Phone Number" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                        <button type="button" className={isSendingOtp ? "btn-loading" : ""} onClick={handleSendOtp} disabled={isSendingOtp}>
                            {isSendingOtp ? "Sending..." : "Send OTP"}
                        </button>
                    </div>

                    <div className="otp">
                        <label htmlFor="otps">OTP</label>
                        {otp.map((digit, i) => (
                            <input
                                key={i}
                                ref={(el) => (inputrefer.current[i] = el)}
                                value={digit}
                                maxLength="1"
                                onChange={(e) => handleotp(e, i)}
                                onKeyDown={(e) => handlekey(e, i)}
                            />
                        ))}
                    </div>
                    {otpHint ? <p className="auth-alert">{otpHint}</p> : null}
                    {phoneLoginError ? <p className="auth-alert auth-alert-error">{phoneLoginError}</p> : null}
                    <div className="resend-otp">
                        <button type="button" className={isSendingOtp ? "btn-loading" : ""} onClick={handleSendOtp} disabled={isSendingOtp}>
                            {isSendingOtp ? "Sending..." : "Resend OTP"}
                        </button>
                    </div>
                    <div className="otp-login">
                        <button onClick={handlesubmit} className={isVerifyingOtp ? "btn-loading" : ""} disabled={isVerifyingOtp}>
                            {isVerifyingOtp ? "Verifying..." : "Login"}
                        </button>
                    </div>
                </div>
            </div>

            <div className={`login-page ${isopen ? "show" : ""}`}>
                <button className="close-btn" onClick={handleclose}>x</button>
                <h1>Login</h1>
                <form className="email-login" onSubmit={handleUserLogin}>
                    <div className="email">
                        <label htmlFor="Email">Email</label>
                        <input
                            type="text"
                            id="Email"
                            placeholder="e.g. example@gmail.com"
                            value={loginEmail}
                            onChange={(e) => setloginEmail(e.target.value)}
                        />
                        <div className="password">
                            <label htmlFor="passs">Password</label>
                            <input
                                type="password"
                                id="passs"
                                placeholder="Enter password"
                                value={loginPassword}
                                onChange={(e) => setloginPassword(e.target.value)}
                            />
                            <h5>Forget password?</h5>
                        </div>
                        <div className="btn">
                            <button className={`login-btn ${isLoggingIn ? "btn-loading" : ""}`} type="submit" disabled={isLoggingIn}>
                                {isLoggingIn ? "Logging in..." : "Login"}
                            </button>
                        </div>
                        {loginError ? <p className="auth-alert auth-alert-error">{loginError}</p> : null}
                        <h3>or</h3>
                    </div>
                </form>
                <div className="login-withphone">
                    <button className="phone-log" onClick={handlephonelogin}>Login with Phone Number</button>
                </div>
                <div className="new-user">
                    <hr />
                    <span>New user?<NavLink to="/register">Register</NavLink></span>
                    <hr />
                </div>
            </div>

            <section className="aboutus" id="about">
                <div className="aboutus-cnt">
                    <div className="headerofabout-ctn">
                        <h2>Who We Are?</h2>
                        <p>
                          BIT Campus Maintenance Request Desk with Geotagged Issue Uploads and Technician Dispatch is a smart web-based platform for reporting and managing campus maintenance issues. Users can submit geotagged complaints with images, while administrators assign technicians and monitor progress. Our goal is to ensure transparent and timely resolution of maintenance requests.
                            <br />
                            Our goal is to create a campus culture where sustainability is not just encouraged - it is actively practiced and tracked.
                        </p>
                    </div>
                    <div className="scrollof-abt">
                        <div className="values-ctn">
                            <div className={`header-values ${ismission || isvision ? "shade" : ""}`}>
                                <h3 onClick={handlevalue}>01|Our values</h3>
                            </div>
                            {isvalue ? (
                                <div className="desc-values">
                                    <ul className="values-list">
                                        <li>Sustainability</li>
                                        <li>Shared Responsibility</li>
                                        <li>Campus Participation</li>
                                        <li>Clear Accountability</li>
                                        <li>Smart Solutions</li>
                                    </ul>
                                </div>
                            ) : ("")}
                        </div>
                        <div className="Mission-ctn">
                            <div className={`header-mission ${isvalue || isvision ? "shade" : ""}`}>
                                <h3 onClick={handlemisson}>02|Mission</h3>
                            </div>
                            {ismission ? (
                                <div className="desc-Mission">
                                    To empower students and staff to actively participate in maintaining environmental standards within the campus by providing a simple, transparent, and accountable digital platform for eco-issue reporting and monitoring.
                                </div>
                            ) : ("")}
                        </div>
                        <div className="Vision-ctn">
                            <div className={`header-vision ${isvalue || ismission ? "shade" : ""}`}>
                                <h3 onClick={handlevision}>03|Vision</h3>
                            </div>
                            {isvision ? (
                                <div className="desc-vision">
                                    To build a sustainable, eco-conscious campus where environmental responsibility is integrated into everyday activities and every reported issue leads to measurable action and improvement.
                                </div>
                            ) : ("")}
                        </div>
                        <div className="scrollof-abtimg">
                            {isvalue ? (<img src="/aboutvalue-img.png" alt="aboutvalue-img" />) : ("")}
                            {ismission ? (<img src="/aboutmission-img.png" alt="aboutmission-img" />) : ("")}
                            {isvision ? (<img src="/aboutvision-img.png" alt="aboutvision-img" className="vision-img" />) : ("")}
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

export default Home;
