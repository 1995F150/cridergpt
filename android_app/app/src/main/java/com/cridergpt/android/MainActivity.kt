package com.cridergpt.android

import android.content.Intent
import android.os.Bundle
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.navigation.fragment.NavHostFragment
import androidx.navigation.ui.AppBarConfiguration
import androidx.navigation.ui.setupActionBarWithNavController
import androidx.navigation.ui.setupWithNavController
import com.cridergpt.android.databinding.ActivityMainBinding
import com.cridergpt.android.utils.NfcManager
import com.cridergpt.android.viewmodels.AuthViewModel
import com.google.android.material.bottomnavigation.BottomNavigationView

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private val authViewModel: AuthViewModel by viewModels()
    private lateinit var nfcManager: NfcManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)

        val navView: BottomNavigationView = binding.navView

        val navHostFragment = supportFragmentManager
            .findFragmentById(R.id.nav_host_fragment_activity_main) as NavHostFragment
        val navController = navHostFragment.navController

        // Passing each menu ID as a set of Ids because each
        // menu should be considered as top level destinations.
        val appBarConfiguration = AppBarConfiguration(
            setOf(
                R.id.navigation_chat,
                R.id.navigation_livestock,
                R.id.navigation_smart_id,
                R.id.navigation_calculators,
                R.id.navigation_calendar
            )
        )
        setupActionBarWithNavController(navController, appBarConfiguration)
        navView.setupWithNavController(navController)

        // Set up profile menu
        binding.toolbar.setOnMenuItemClickListener { menuItem ->
            when (menuItem.itemId) {
                R.id.action_profile -> {
                    navController.navigate(R.id.navigation_profile)
                    true
                }
                R.id.action_sign_out -> {
                    authViewModel.signOut()
                    true
                }
                else -> false
            }
        }

        // Initialize NFC Manager
        nfcManager = NfcManager(this)

        // Handle NFC intent if app was launched by NFC
        intent?.let { handleIntent(it) }

        // Observe auth state
        authViewModel.user.observe(this) { user ->
            if (user == null) {
                // Navigate to login if not authenticated
                navController.navigate(R.id.navigation_auth)
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent) {
        nfcManager.handleNfcIntent(intent)
    }

    override fun onResume() {
        super.onResume()
        // Start NFC scanning when activity is resumed
        nfcManager.startScanning(this)
    }

    override fun onPause() {
        super.onPause()
        // Stop NFC scanning when activity is paused
        nfcManager.stopScanning(this)
    }
}