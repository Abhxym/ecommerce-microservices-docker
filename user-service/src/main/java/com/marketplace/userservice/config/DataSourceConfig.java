package com.marketplace.userservice.config;

import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.net.InetSocketAddress;
import java.net.Socket;

@Configuration
public class DataSourceConfig {

    private static final Logger log = LoggerFactory.getLogger(DataSourceConfig.class);

    @Value("${DB_HOST:localhost}")
    private String dbHost;

    @Value("${DB_PORT:3306}")
    private int dbPort;

    @Value("${DB_NAME:marketplace}")
    private String dbName;

    @Value("${DB_USER:marketplace}")
    private String dbUser;

    @Value("${DB_PASSWORD:change_me_app}")
    private String dbPassword;

    @Bean
    @Primary
    public DataSource dataSource() {
        if (isHostAvailable(dbHost, dbPort, 1500)) {
            log.info(">> MySQL server detected at {}:{}. Connecting to MySQL database '{}'...", dbHost, dbPort, dbName);
            HikariDataSource ds = new HikariDataSource();
            ds.setDriverClassName("com.mysql.cj.jdbc.Driver");
            ds.setJdbcUrl("jdbc:mysql://" + dbHost + ":" + dbPort + "/" + dbName
                    + "?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC");
            ds.setUsername(dbUser);
            ds.setPassword(dbPassword);
            ds.setMaximumPoolSize(10);
            return ds;
        } else {
            log.warn(">> MySQL is not reachable at {}:{}. Automatically using in-memory database so the service is fully functional!", dbHost, dbPort);
            HikariDataSource ds = new HikariDataSource();
            ds.setDriverClassName("org.h2.Driver");
            ds.setJdbcUrl("jdbc:h2:mem:marketplace;DB_CLOSE_DELAY=-1;MODE=MySQL;DATABASE_TO_LOWER=TRUE");
            ds.setUsername("sa");
            ds.setPassword("");
            ds.setMaximumPoolSize(5);
            return ds;
        }
    }

    private boolean isHostAvailable(String host, int port, int timeoutMs) {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, port), timeoutMs);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}

