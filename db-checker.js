const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");
require("dotenv").config();

class DatabaseChecker {
  constructor() {
    this.SUPABASE_URL = process.env.SUPABASE_URL;
    this.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
    this.ENABLE_SUPABASE = process.env.ENABLE_SUPABASE === "true";
    this.supabase = null;

    console.log("🔍 Database Connectivity Checker Initialized");
    console.log("=".repeat(50));
  }

  async init() {
    console.log("\n📋 Environment Configuration Check:");
    console.log(
      `   SUPABASE_URL: ${this.SUPABASE_URL ? "✅ Set" : "❌ Missing"}`
    );
    console.log(
      `   SUPABASE_ANON_KEY: ${
        this.SUPABASE_ANON_KEY ? "✅ Set" : "❌ Missing"
      }`
    );
    console.log(
      `   ENABLE_SUPABASE: ${this.ENABLE_SUPABASE ? "✅ true" : "❌ false"}`
    );

    if (!this.SUPABASE_URL || !this.SUPABASE_ANON_KEY) {
      console.log("\n❌ Missing required Supabase configuration!");
      return false;
    }

    if (!this.ENABLE_SUPABASE) {
      console.log("\n⚠️ Supabase is disabled (ENABLE_SUPABASE=false)");
      return false;
    }

    try {
      this.supabase = createClient(this.SUPABASE_URL, this.SUPABASE_ANON_KEY);
      console.log("✅ Supabase client created successfully");
      return true;
    } catch (error) {
      console.log("❌ Failed to create Supabase client:", error.message);
      return false;
    }
  }

  async testBasicConnection() {
    console.log("\n🔗 Testing Basic Connection:");

    try {
      // Fix the SQL syntax - use proper count query
      const { data, error, count } = await this.supabase
        .from("user_locations")
        .select("*", { count: "exact", head: true })
        .limit(1);

      if (error) {
        console.log("❌ Connection failed:", error.message);
        console.log("   Details:", error.details);
        console.log("   Hint:", error.hint);
        return false;
      }

      console.log("✅ Basic connection successful");
      console.log(`   Table has ${count || 0} records`);
      return true;
    } catch (error) {
      console.log("❌ Connection error:", error.message);
      return false;
    }
  }

  async checkTableExists() {
    console.log("\n📊 Checking Table Existence:");

    try {
      const { data, error } = await this.supabase
        .from("user_locations")
        .select("*")
        .limit(1);

      if (error) {
        if (error.message.includes("does not exist")) {
          console.log("❌ Table 'user_locations' does not exist");
          console.log("💡 You need to create the table first");
          return false;
        }
        console.log("❌ Table check failed:", error.message);
        return false;
      }

      console.log("✅ Table 'user_locations' exists");
      return true;
    } catch (error) {
      console.log("❌ Table existence check error:", error.message);
      return false;
    }
  }

  async checkTableStructure() {
    console.log("\n🏗️ Checking Table Structure:");

    try {
      // Simplified approach - try inserting and see what fails
      console.log("   Testing column compatibility...");

      const testRecord = {
        latitude: 0.0,
        longitude: 0.0,
        city_name: "Test City",
        country: "Test Country",
        ip_address: "127.0.0.1",
        user_agent: "Test Agent",
        timestamp: new Date().toISOString(),
        // Enhanced columns
        accuracy: 10.5,
        altitude: 100.0,
        altitude_accuracy: 5.0,
        heading: 90.0,
        speed: 0.0,
        timezone: "UTC",
        formatted_address: "Test Address",
        place_id: "test_place_id",
        location_source: "test",
        ip_country: "US",
        ip_region: "California",
        ip_city: "San Francisco",
        ip_timezone: "America/Los_Angeles",
        ip_isp: "Test ISP",
        ip_org: "Test Org",
      };

      // Try to insert test record to check structure
      const { data: insertData, error: insertError } = await this.supabase
        .from("user_locations")
        .insert([testRecord])
        .select();

      if (insertError) {
        if (insertError.message.includes("row-level security")) {
          console.log(
            "⚠️ RLS policy preventing insert, but table structure seems OK"
          );
          console.log("   This will be tested separately in permissions check");
          return true;
        } else if (
          insertError.message.includes("column") &&
          insertError.message.includes("does not exist")
        ) {
          const missingColumn = insertError.message.match(/column "([^"]+)"/);
          if (missingColumn) {
            console.log(`❌ Missing column: ${missingColumn[1]}`);
            return false;
          }
        } else {
          console.log("❌ Structure test failed:", insertError.message);
          return false;
        }
      } else {
        console.log("✅ All required columns exist (test insert successful)");
        // Clean up test record
        if (insertData && insertData[0]) {
          await this.supabase
            .from("user_locations")
            .delete()
            .eq("id", insertData[0].id);
          console.log("✅ Test record cleaned up");
        }
        return true;
      }

      return true;
    } catch (error) {
      console.log("❌ Table structure check failed:", error.message);
      return false;
    }
  }

  async testInsertPermissions() {
    console.log("\n🔐 Testing Insert Permissions:");

    // Comprehensive test record with ALL possible fields including new ones
    const testRecord = {
      latitude: 28.7041,
      longitude: 77.1025,
      city_name: "Test Delhi Comprehensive",
      country: "IN",
      ip_address: "203.123.45.67", // Use a realistic IP
      user_agent: "DB Checker Comprehensive Test Agent",
      timestamp: new Date().toISOString(),
      location_source: "comprehensive_test",
      // Enhanced GPS fields
      accuracy: 15.5,
      altitude: 245.7,
      altitude_accuracy: 8.2,
      heading: 135.4,
      speed: 2.3,
      timezone: "Asia/Kolkata",
      formatted_address: "Connaught Place, New Delhi, Delhi 110001, India",
      place_id: "ChIJLbZ-NFv9DDkRzk0gTkm3wlI",
      // IP geolocation fields
      ip_country: "India",
      ip_region: "Delhi",
      ip_city: "New Delhi",
      ip_timezone: "Asia/Kolkata",
      ip_isp: "Bharti Airtel Ltd.",
      ip_org: "Bharti Airtel Ltd.",
      ip_latitude: 28.7041,
      ip_longitude: 77.1025,
      ip_zip: "110001",
      // New comprehensive fields
      screen_resolution: "1920x1080",
      language: "en-US",
      platform: "Win32",
      cookie_enabled: true,
      online_status: true,
    };

    try {
      console.log("   Testing comprehensive data insertion...");
      console.log(
        "   Comprehensive fields to test:",
        Object.keys(testRecord).length
      );

      const { data, error } = await this.supabase
        .from("user_locations")
        .insert([testRecord])
        .select();

      if (error) {
        console.log("❌ Insert permission denied or failed:", error.message);
        console.log("   Code:", error.code);
        console.log("   Details:", error.details);

        if (
          error.message.includes("RLS") ||
          error.message.includes("row-level security")
        ) {
          console.log("💡 This is a Row Level Security (RLS) policy issue");
        }
        if (
          error.message.includes("column") &&
          error.message.includes("does not exist")
        ) {
          const missingColumn = error.message.match(/column "([^"]+)"/);
          if (missingColumn) {
            console.log(`💡 Missing column: ${missingColumn[1]}`);
            console.log(
              "💡 Run the update-database-schema.sql to add missing columns"
            );
          }
        }

        return false;
      }

      console.log("✅ Insert permission granted with comprehensive data");

      // Verify all fields were saved properly
      if (data && data[0]) {
        const savedRecord = data[0];
        console.log("   Verifying comprehensive saved data:");

        // Categorize fields for better verification display
        const fieldCategories = {
          "GPS Core": ["latitude", "longitude", "accuracy"],
          "GPS Enhanced": ["altitude", "altitude_accuracy", "heading", "speed"],
          "Location Info": ["timezone", "formatted_address", "place_id"],
          "IP Location": [
            "ip_country",
            "ip_city",
            "ip_latitude",
            "ip_longitude",
            "ip_zip",
          ],
          "Device Info": [
            "screen_resolution",
            "language",
            "platform",
            "cookie_enabled",
            "online_status",
          ],
          "Basic Info": ["city_name", "country", "location_source"],
        };

        let totalFieldsSaved = 0;
        let totalFieldsExpected = 0;

        Object.entries(fieldCategories).forEach(([category, fields]) => {
          const savedFields = fields.filter(
            (field) =>
              savedRecord[field] !== null && savedRecord[field] !== undefined
          );
          totalFieldsSaved += savedFields.length;
          totalFieldsExpected += fields.length;

          console.log(
            `   ${category}: ${savedFields.length}/${fields.length} fields saved`
          );

          savedFields.forEach((field) => {
            console.log(`      ✅ ${field}: ${savedRecord[field]}`);
          });

          fields
            .filter(
              (field) =>
                savedRecord[field] === null || savedRecord[field] === undefined
            )
            .forEach((field) => {
              console.log(
                `      ⚠️ ${field}: NULL (expected: ${testRecord[field]})`
              );
            });
        });

        console.log(
          `   📊 Overall: ${totalFieldsSaved}/${totalFieldsExpected} comprehensive fields saved`
        );

        // Clean up test record
        await this.supabase
          .from("user_locations")
          .delete()
          .eq("id", savedRecord.id);
        console.log("✅ Comprehensive test record cleaned up");
      }

      return true;
    } catch (error) {
      console.log("❌ Insert test error:", error.message);
      return false;
    }
  }

  async testSelectPermissions() {
    console.log("\n📖 Testing Select Permissions:");

    try {
      const { data, error } = await this.supabase
        .from("user_locations")
        .select("id, latitude, longitude, created_at")
        .limit(5);

      if (error) {
        console.log("❌ Select permission denied:", error.message);
        return false;
      }

      console.log(
        `✅ Select permission granted (found ${data?.length || 0} records)`
      );
      return true;
    } catch (error) {
      console.log("❌ Select test error:", error.message);
      return false;
    }
  }

  async checkNetworkConnectivity() {
    console.log("\n🌐 Testing Network Connectivity:");

    try {
      // Test Supabase domain connectivity first (more important)
      console.log("   Testing Supabase connectivity...");
      const supabaseTest = await axios.get(this.SUPABASE_URL + "/rest/v1/", {
        headers: {
          apikey: this.SUPABASE_ANON_KEY,
        },
        timeout: 8000, // Longer timeout for Supabase
      });
      console.log("✅ Supabase domain accessible");

      // Test general internet connectivity (optional)
      try {
        const internetTest = await axios.get("https://httpbin.org/status/200", {
          timeout: 3000, // Shorter timeout for general internet
        });
        console.log("✅ Internet connectivity working");
      } catch (internetError) {
        console.log("⚠️ General internet test failed, but Supabase works");
      }

      return true;
    } catch (error) {
      console.log("❌ Supabase connectivity issue:", error.message);
      if (error.code === "ENOTFOUND") {
        console.log("💡 DNS resolution failed - check internet connection");
      } else if (error.code === "ECONNREFUSED") {
        console.log("💡 Connection refused - check firewall/proxy settings");
      } else if (error.code === "ECONNABORTED") {
        console.log("💡 Connection timeout - network might be slow");
      }
      return false;
    }
  }

  async fixRLSPolicies() {
    console.log("\n🔧 Attempting to Fix RLS Policies:");

    try {
      // Try to create/update RLS policies
      console.log(
        "   Note: RLS policies need to be fixed in Supabase dashboard"
      );
      console.log(
        "   Go to: Authentication > Policies in your Supabase dashboard"
      );

      return false; // Can't fix from here, needs manual intervention
    } catch (error) {
      console.log("❌ Cannot fix RLS policies programmatically");
      return false;
    }
  }

  async generateRLSPolicySQL() {
    console.log("\n📝 SQL to Fix RLS Policies:");
    console.log("   Copy and paste this SQL in your Supabase SQL editor:");
    console.log("   " + "=".repeat(60));

    const rlsPolicySQL = `
-- Drop existing policies (if they exist)
DROP POLICY IF EXISTS "Allow anonymous inserts" ON user_locations;
DROP POLICY IF EXISTS "Allow anonymous reads" ON user_locations;
DROP POLICY IF EXISTS "Allow service role to read all" ON user_locations;

-- Create new policies that actually work
CREATE POLICY "Enable insert for anon users" 
ON user_locations 
FOR INSERT 
TO anon 
WITH CHECK (true);

CREATE POLICY "Enable read for anon users" 
ON user_locations 
FOR SELECT 
TO anon 
USING (true);

CREATE POLICY "Enable all for authenticated users" 
ON user_locations 
FOR ALL 
TO authenticated 
USING (true);

-- Make sure RLS is enabled
ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;

-- Verify policies
SELECT * FROM pg_policies WHERE tablename = 'user_locations';
`;

    console.log(rlsPolicySQL);
    console.log("   " + "=".repeat(60));
  }

  async generateCreateTableSQL() {
    console.log("\n📝 SQL to Create Missing Table:");
    console.log("   Copy and paste this SQL in your Supabase SQL editor:");
    console.log("   " + "=".repeat(60));

    const createTableSQL = `
-- Create user_locations table with all required columns
CREATE TABLE IF NOT EXISTS user_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  city_name VARCHAR(255),
  country VARCHAR(100),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_agent TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Enhanced location columns (THESE ARE CRITICAL!)
  accuracy DECIMAL(10, 2),
  altitude DECIMAL(10, 2),
  altitude_accuracy DECIMAL(10, 2),
  heading DECIMAL(5, 2),
  speed DECIMAL(8, 3),
  timezone VARCHAR(50),
  formatted_address TEXT,
  place_id VARCHAR(255),
  location_source VARCHAR(50),
  
  -- IP geolocation columns (THESE ARE ALSO CRITICAL!)
  ip_country VARCHAR(100),
  ip_region VARCHAR(100),
  ip_city VARCHAR(100),
  ip_timezone VARCHAR(50),
  ip_isp VARCHAR(255),
  ip_org VARCHAR(255)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_locations_timestamp 
ON user_locations(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_user_locations_coordinates 
ON user_locations(latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_user_locations_accuracy 
ON user_locations(accuracy);

CREATE INDEX IF NOT EXISTS idx_user_locations_source 
ON user_locations(location_source);

CREATE INDEX IF NOT EXISTS idx_user_locations_ip_country 
ON user_locations(ip_country);

-- Enable Row Level Security (RLS)
ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies first
DROP POLICY IF EXISTS "Allow anonymous inserts" ON user_locations;
DROP POLICY IF EXISTS "Allow anonymous reads" ON user_locations;
DROP POLICY IF EXISTS "Allow service role to read all" ON user_locations;
DROP POLICY IF EXISTS "Enable insert for anon users" ON user_locations;
DROP POLICY IF EXISTS "Enable read for anon users" ON user_locations;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON user_locations;

-- Create working policies
CREATE POLICY "allow_anon_insert" ON user_locations
    FOR INSERT TO anon
    WITH CHECK (true);

CREATE POLICY "allow_anon_select" ON user_locations  
    FOR SELECT TO anon
    USING (true);

CREATE POLICY "allow_authenticated_all" ON user_locations
    FOR ALL TO authenticated  
    USING (true);

-- Grant necessary permissions
GRANT ALL ON user_locations TO anon;
GRANT ALL ON user_locations TO authenticated;

-- Verify table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_locations' 
ORDER BY ordinal_position;

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'user_locations';
`;

    console.log(createTableSQL);
    console.log("   " + "=".repeat(60));
    console.log("\n💡 IMPORTANT NOTES:");
    console.log("   - This SQL creates ALL the enhanced tracking columns");
    console.log("   - Make sure to run this COMPLETE SQL script");
    console.log(
      "   - The enhanced fields will only work if these columns exist"
    );
  }

  async runFullDiagnostic() {
    console.log("🚀 Starting Full Database Diagnostic\n");

    const results = {
      initialization: false,
      networkConnectivity: false,
      basicConnection: false,
      tableExists: false,
      tableStructure: false,
      selectPermissions: false,
      insertPermissions: false,
    };

    // Step 1: Initialize
    results.initialization = await this.init();
    if (!results.initialization) {
      console.log("\n❌ Initialization failed - cannot continue");
      await this.generateCreateTableSQL();
      return results;
    }

    // Step 2: Network connectivity (less critical now)
    results.networkConnectivity = await this.checkNetworkConnectivity();

    // Step 3: Basic connection
    results.basicConnection = await this.testBasicConnection();

    if (!results.basicConnection) {
      console.log(
        "\n❌ Basic connection failed - check your Supabase URL and keys"
      );
      return results;
    }

    // Step 4: Table existence
    results.tableExists = await this.checkTableExists();

    if (!results.tableExists) {
      console.log("\n❌ Table doesn't exist");
      await this.generateCreateTableSQL();
      return results;
    }

    // Step 5: Table structure
    results.tableStructure = await this.checkTableStructure();

    // Step 6: Permissions
    results.selectPermissions = await this.testSelectPermissions();
    results.insertPermissions = await this.testInsertPermissions();

    // Summary and recommendations
    console.log("\n📋 DIAGNOSTIC SUMMARY");
    console.log("=".repeat(50));
    console.log(
      `✅ Initialization: ${results.initialization ? "PASS" : "FAIL"}`
    );
    console.log(
      `✅ Network Connectivity: ${
        results.networkConnectivity ? "PASS" : "WARN"
      }`
    );
    console.log(
      `✅ Basic Connection: ${results.basicConnection ? "PASS" : "FAIL"}`
    );
    console.log(`✅ Table Exists: ${results.tableExists ? "PASS" : "FAIL"}`);
    console.log(
      `✅ Table Structure: ${results.tableStructure ? "PASS" : "WARN"}`
    );
    console.log(
      `✅ Select Permissions: ${results.selectPermissions ? "PASS" : "FAIL"}`
    );
    console.log(
      `✅ Insert Permissions: ${results.insertPermissions ? "PASS" : "FAIL"}`
    );

    // Recommendations
    console.log("\n🔧 RECOMMENDATIONS:");

    if (!results.basicConnection) {
      console.log("❌ Check Supabase URL and API key configuration");
    } else if (!results.tableExists) {
      console.log("❌ Create the user_locations table first");
      await this.generateCreateTableSQL();
    } else if (!results.insertPermissions) {
      console.log("❌ Fix Row Level Security (RLS) policies");
      await this.generateRLSPolicySQL();
      console.log("\n💡 QUICK FIX:");
      console.log("   1. Go to your Supabase dashboard");
      console.log("   2. Navigate to Authentication > Policies");
      console.log("   3. Find the 'user_locations' table");
      console.log("   4. Delete any existing policies");
      console.log("   5. Run the SQL above in the SQL editor");
    } else if (results.insertPermissions && results.selectPermissions) {
      console.log("✅ Database is fully functional!");
      console.log("🎉 Your location tracking should work now!");
    }

    // Special case: Network issues but DB works
    if (!results.networkConnectivity && results.basicConnection) {
      console.log(
        "\n⚠️ NOTE: Network test failed but Supabase connection works."
      );
      console.log(
        "   This is likely due to firewall/proxy settings but won't affect functionality."
      );
    }

    return results;
  }
}

// Run the diagnostic when script is executed directly
if (require.main === module) {
  const checker = new DatabaseChecker();
  checker
    .runFullDiagnostic()
    .then((results) => {
      const allPassed = Object.values(results).every(
        (result) => result === true
      );
      console.log(
        `\n🎯 Overall Status: ${
          allPassed ? "✅ ALL TESTS PASSED" : "❌ ISSUES FOUND"
        }`
      );
      process.exit(allPassed ? 0 : 1);
    })
    .catch((error) => {
      console.error("\n💥 Diagnostic crashed:", error.message);
      process.exit(1);
    });
}

module.exports = DatabaseChecker;
